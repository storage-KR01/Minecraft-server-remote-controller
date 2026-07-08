# Chỉ thị triển khai tiếp theo — `server-control-center`

> Dựa trên trạng thái thật đã xác nhận: Backend NestJS chạy **privileged + `pid: host`**, mount `/run/systemd` để gọi thẳng binary `systemctl`. Không dùng ORM — chỉ `pg` pool thô. Tài liệu này là danh sách chỉ thị theo thứ tự phụ thuộc, có thể đưa thẳng cho agent code (Copilot) thực thi từng sprint.

---

## 0. Rủi ro cần ghi nhận trước khi code tiếp (không chặn tiến độ, nhưng phải biết)

Container backend chạy **`privileged: true` + `pid: host`** = về bản chất có quyền tương đương root trên toàn VM (không chỉ riêng systemd). Đây là quyết định đã chốt trong hạ tầng hiện tại nên không đề xuất đảo ngược, nhưng bắt buộc phải **bù lại bằng kiểm soát ở tầng ứng dụng**:

- **Không bao giờ** cho phép `unit` name trong lệnh `systemctl` đến trực tiếp từ input người dùng/frontend. Luôn validate: unit phải khớp `systemd_unit` đã có sẵn trong bảng `servers` (do Discovery quét ra), không nhận chuỗi tự do.
- Danh sách operation cho phép **giữ đúng whitelist đã có** trong `systemd.service.ts` (`start`, `stop`, `restart`, `status`, `journal`, `daemon-reload`) — không mở rộng thêm free-form shell command.
- Mọi lệnh gọi `systemctl`/`journalctl` phải qua `child_process.execFile` (không phải `exec`) để tránh shell injection — `execFile` không đi qua shell nên tham số không bị inject.

---

## 1. Sprint 1 — Database schema (nền tảng, làm trước tiên)

Vì backend chỉ dùng `pg` pool thô, cần 1 cách quản lý migration nhất quán. Đề xuất dùng **`node-pg-migrate`** (nhẹ, không ép ORM, sinh file `.sql`/`.js` versioned).

```bash
cd backend
npm install node-pg-migrate --save-dev
npx node-pg-migrate create init-discovery-and-state
```

### DDL cần có (viết trong migration)

```sql
-- servers: cache kết quả discovery
CREATE TABLE servers (
  id               TEXT PRIMARY KEY,        -- vd 'mc-server-survival-s1'
  path             TEXT NOT NULL,
  display_name     TEXT NOT NULL,
  game_port        INTEGER,
  rcon_port        INTEGER,
  rcon_password_enc TEXT,                    -- mã hoá bằng key trong .env, KHÔNG lưu plaintext
  systemd_unit     TEXT NOT NULL UNIQUE,
  last_scanned_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- system_state: 1 row duy nhất, lock 1-server + server đang active
CREATE TABLE system_state (
  id                 SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_server_id   TEXT REFERENCES servers(id) ON DELETE SET NULL,
  lock_mode          TEXT NOT NULL DEFAULT 'locked' CHECK (lock_mode IN ('locked', 'unlocked')),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO system_state (id) VALUES (1);

-- audit_log
CREATE TABLE audit_log (
  id               BIGSERIAL PRIMARY KEY,
  actor_user_id    UUID REFERENCES users(id),
  action           TEXT NOT NULL,             -- vd 'server:start', 'console:command_run'
  target_server_id TEXT,
  payload_json      JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX idx_audit_log_target_server ON audit_log (target_server_id);
```

**Acceptance criteria Sprint 1:**
- [ ] `npx node-pg-migrate up` chạy thành công trên DB local
- [ ] 3 bảng trên tồn tại, `system_state` có sẵn đúng 1 row

---

## 2. Sprint 2 — Discovery module thật

### 2.1 Cần bổ sung volume mount (khác với `/run/systemd`)

`/run/systemd` chỉ đủ để **gọi systemctl**, **không** cho backend thấy được các thư mục chứa server Minecraft (`/home`, `/opt`...). Cần thêm mount **riêng, read-only** cho việc quét:

```yaml
# docker-compose.yml — bổ sung vào service backend
services:
  backend:
    volumes:
      - /run/systemd:/run/systemd
      - /home:/host/home:ro
      - /opt:/host/opt:ro
      - /srv:/host/srv:ro
    environment:
      MC_SEARCH_ROOTS: "/host/home,/host/opt,/host/srv"
```

> Dùng prefix `/host/...` để tránh nhầm lẫn với filesystem thật của container. `MC_SEARCH_ROOTS` đọc từ `.env`.

### 2.2 Logic quét (`discovery.service.ts`)

```ts
import { readdirSync, existsSync, statSync, readFileSync } from "fs";
import { join } from "path";

const PREFIX = "mc-server-";
const EXCLUDE = new Set(["proc", "sys", "dev", "node_modules", ".git"]);

@Injectable()
export class DiscoveryService {
  constructor(private db: DatabaseService) {}

  async rescan(): Promise<ServerMeta[]> {
    const roots = (process.env.MC_SEARCH_ROOTS ?? "").split(",").filter(Boolean);
    const maxDepth = Number(process.env.MC_SCAN_MAX_DEPTH ?? 6);
    const found: ServerMeta[] = [];
    for (const root of roots) this.walk(root, 0, maxDepth, found);

    await this.db.query("DELETE FROM servers");
    for (const s of found) {
      await this.db.query(
        `INSERT INTO servers (id, path, display_name, game_port, rcon_port, rcon_password_enc, systemd_unit, last_scanned_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7, now())`,
        [s.id, s.path, s.displayName, s.gamePort, s.rconPort, encrypt(s.rconPassword), s.systemdUnit],
      );
    }
    return found;
  }

  private walk(dir: string, depth: number, maxDepth: number, acc: ServerMeta[]) {
    if (depth > maxDepth || !existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (EXCLUDE.has(name)) continue;
      const full = join(dir, name);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (!st.isDirectory()) continue;
      if (name.startsWith(PREFIX)) {
        const meta = this.tryExtract(full, name);
        if (meta) acc.push(meta);
        continue; // không đi sâu hơn vào bên trong 1 server đã nhận diện
      }
      this.walk(full, depth + 1, maxDepth, acc);
    }
  }

  private tryExtract(fullPath: string, dirName: string): ServerMeta | null {
    const hasProps = existsSync(join(fullPath, "server.properties"));
    const hasEula = existsSync(join(fullPath, "eula.txt"));
    if (!hasProps && !hasEula) return null;

    const props = hasProps ? parseProperties(readFileSync(join(fullPath, "server.properties"), "utf8")) : {};
    let override: any = {};
    const metaFile = join(fullPath, "controller.meta.json");
    if (existsSync(metaFile)) override = JSON.parse(readFileSync(metaFile, "utf8"));

    return {
      id: dirName,
      path: fullPath,
      displayName: override.display_name ?? dirName.replace(PREFIX, ""),
      gamePort: Number(props["server-port"]) || null,
      rconPort: Number(props["rcon.port"]) || null,
      rconPassword: override.rcon_password ?? props["rcon.password"] ?? null,
      systemdUnit: `${dirName}.service`,
    };
  }

  async list() {
    return this.db.query("SELECT id, display_name, game_port, systemd_unit, last_scanned_at FROM servers ORDER BY display_name");
  }

  async getById(id: string) {
    const res = await this.db.query("SELECT * FROM servers WHERE id = $1", [id]);
    return res.rows[0] ?? null;
  }
}
```

### 2.3 Endpoints cần thêm vào `discovery.controller.ts`

```
GET  /api/servers            → DiscoveryService.list()
POST /api/servers/rescan     → DiscoveryService.rescan()   [chỉ role Admin/Operator]
GET  /api/servers/:id        → DiscoveryService.getById(id)
GET  /api/servers/active     → join với system_state.active_server_id
```

**Acceptance criteria Sprint 2:**
- [ ] Tạo 1 thư mục test `/opt/mc-server-test/` trên host có `eula.txt` rỗng → gọi `POST /api/servers/rescan` → `GET /api/servers` trả về đúng entry này
- [ ] Thư mục không đúng prefix hoặc thiếu `eula.txt`/`server.properties` **không** xuất hiện trong kết quả
- [ ] `rcon_password_enc` không lưu plaintext trong DB (kiểm tra bằng `SELECT` trực tiếp)

---

## 3. Sprint 3 — Systemd module thật

### 3.1 Thực thi lệnh (`systemd.service.ts`)

```ts
import { execFile } from "child_process";
import { promisify } from "util";
const execFileAsync = promisify(execFile);

const ALLOWED_OPS = ["start", "stop", "restart", "status"] as const;

@Injectable()
export class SystemdService {
  constructor(private discovery: DiscoveryService, private db: DatabaseService) {}

  async run(op: typeof ALLOWED_OPS[number], unit: string) {
    if (!ALLOWED_OPS.includes(op)) throw new BadRequestException("Operation không hợp lệ");
    // BẮT BUỘC: xác thực unit này thuộc 1 server đã discover, không nhận chuỗi tự do
    const known = await this.db.query("SELECT 1 FROM servers WHERE systemd_unit = $1", [unit]);
    if (known.rowCount === 0) throw new BadRequestException("Unit không nằm trong danh sách server đã quét");

    const { stdout, stderr } = await execFileAsync("systemctl", [op, unit]);
    return { stdout, stderr };
  }

  async journal(unit: string, lines = 200) {
    const known = await this.db.query("SELECT 1 FROM servers WHERE systemd_unit = $1", [unit]);
    if (known.rowCount === 0) throw new BadRequestException("Unit không hợp lệ");
    const { stdout } = await execFileAsync("journalctl", ["-u", unit, "-n", String(lines), "--no-pager"]);
    return stdout;
  }
}
```

### 3.2 Logic start/stop có khoá 1-server (đặt ở `discovery`/`systemd` controller hoặc 1 `orchestration.service.ts` mới)

```ts
async startServer(serverId: string) {
  const server = await this.discovery.getById(serverId);
  if (!server) throw new NotFoundException();

  const state = (await this.db.query("SELECT * FROM system_state WHERE id = 1")).rows[0];
  if (state.lock_mode === "locked" && state.active_server_id && state.active_server_id !== serverId) {
    throw new ConflictException(`Server '${state.active_server_id}' đang chạy. Tắt trước khi bật server khác.`);
  }

  await this.systemd.run("start", server.systemd_unit);
  await this.db.query("UPDATE system_state SET active_server_id = $1, updated_at = now() WHERE id = 1", [serverId]);
  await this.audit.log(actor, "server:start", serverId, {});
  return { status: "started" };
}

async stopServer(serverId: string) {
  const server = await this.discovery.getById(serverId);
  try {
    await this.rcon.run(server, "save-all");
    await this.rcon.run(server, "stop");
    await this.waitForExit(server, 30_000);
  } catch { /* fallback dưới */ }
  await this.systemd.run("stop", server.systemd_unit);
  await this.db.query("UPDATE system_state SET active_server_id = NULL, updated_at = now() WHERE id = 1");
  await this.audit.log(actor, "server:stop", serverId, {});
  return { status: "stopped" };
}
```

### 3.3 Auto-resume khi backend restart (`onModuleInit` trong `SystemdModule` hoặc `AppModule`)

```ts
async onModuleInit() {
  const state = (await this.db.query("SELECT active_server_id FROM system_state WHERE id = 1")).rows[0];
  if (state?.active_server_id) {
    const server = await this.discovery.getById(state.active_server_id);
    if (server) await this.systemd.run("start", server.systemd_unit);
  }
}
```

### 3.4 Endpoints cần thêm

```
POST /api/servers/:id/start     [Admin, Operator]
POST /api/servers/:id/stop      [Admin, Operator]
GET  /api/servers/:id/status
GET  /api/servers/:id/journal?lines=200

GET  /api/system/lock-mode
POST /api/system/lock-mode      { mode: "locked" | "unlocked" }   [Admin only]
```

**Acceptance criteria Sprint 3:**
- [ ] Start server A → start server B khi `lock_mode=locked` → nhận lỗi 409, server A vẫn chạy
- [ ] Chuyển `lock_mode=unlocked` → có thể start B cùng lúc A đang chạy
- [ ] Restart backend container trong lúc 1 server đang chạy → sau khi backend lên lại, đúng server đó tự khởi động lại (không phải server khác, không phải tất cả)
- [ ] Gọi `systemctl` với unit không có trong bảng `servers` → 400, không thực thi

---

## 4. Sprint 4 — RCON module thật

```bash
cd backend && npm install rcon-client
```

```ts
// rcon.service.ts
import { Rcon } from "rcon-client";

@Injectable()
export class RconService {
  async run(server: ServerRow, command: string): Promise<string> {
    if (!server.rcon_port || !server.rcon_password_enc) {
      throw new BadRequestException("Server chưa cấu hình RCON");
    }
    const rcon = await Rcon.connect({
      host: "127.0.0.1",
      port: server.rcon_port,
      password: decrypt(server.rcon_password_enc),
      timeout: 5000,
    });
    try {
      return await rcon.send(command);
    } finally {
      await rcon.end();
    }
  }

  getOnlinePlayers(server: ServerRow) { return this.run(server, "list"); }
  broadcast(server: ServerRow, msg: string) { return this.run(server, `say ${msg}`); }
  ban(server: ServerRow, player: string, reason = "") { return this.run(server, `ban ${player} ${reason}`.trim()); }
  kick(server: ServerRow, player: string, reason = "") { return this.run(server, `kick ${player} ${reason}`.trim()); }
  pardon(server: ServerRow, player: string) { return this.run(server, `pardon ${player}`); }
}
```

```ts
// rcon.gateway.ts — nối message "command" đã khai báo sẵn
@SubscribeMessage("command")
async handleCommand(@ConnectedSocket() client: Socket, @MessageBody() payload: { serverId: string; raw: string }) {
  const server = await this.discovery.getRowById(payload.serverId);
  if (!server) return client.emit("command:error", { message: "Server không tồn tại" });

  try {
    const output = await this.rcon.run(server, payload.raw);
    await this.audit.log(client.data.user, "console:command_run", payload.serverId, { raw: payload.raw });
    client.emit("command:result", { output });
  } catch (err) {
    client.emit("command:error", { message: err.message });
  }
}
```

**Vì sao KHÔNG cần thêm mount host cho RCON:** RCON chỉ là TCP tới `127.0.0.1:<rcon_port>`. Với `network_mode` hiện tại (nếu backend dùng `pid: host` thường đi kèm cấu hình network cũng thoáng hơn), container gọi được tới cổng của host miễn RCON bind đúng cổng đó và không bị firewall nội bộ chặn. Cần xác nhận thêm: server Minecraft có `enable-rcon=true` và `rcon.password` đã set trong `server.properties` chưa — nếu chưa, cần bật trước khi test.

**Acceptance criteria Sprint 4:**
- [ ] Gửi `command: "list"` qua `/ws/rcon` tới 1 server test đang chạy → nhận `command:result` đúng danh sách người chơi
- [ ] Gửi lệnh tới server không active → nhận lỗi rõ ràng, không crash gateway
- [ ] Mỗi lệnh chạy đều có 1 dòng tương ứng trong `audit_log`

---

## 5. Sprint 5 — Audit thật (interceptor dùng chung, tránh gọi tay rải rác)

```ts
// audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService, private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>("audit:action", context.getHandler());
    if (!action) return next.handle();

    const req = context.switchToHttp().getRequest();
    return next.handle().pipe(
      tap(() => this.auditService.log(req.user, action, req.params?.id, req.body)),
    );
  }
}

// decorator dùng trên controller method
export const Audit = (action: string) => SetMetadata("audit:action", action);
```

Áp `@Audit("server:start")` lên `SystemdController.start()`, `@Audit("server:stop")` lên `stop()`, v.v. — không cần sửa logic nghiệp vụ, chỉ thêm decorator.

**Acceptance criteria Sprint 5:**
- [ ] Mọi action trong danh sách (`server:start/stop`, `console:command_run`, `player:ban/kick`, `system:lock_mode_changed`) đều có bản ghi `audit_log` kèm đúng `actor_user_id`

---

## 6. Sprint 6 — RBAC mở rộng

Áp `@Roles("Admin", "Operator")` (guard đã có sẵn `roles.guard.ts`) lên toàn bộ endpoint ghi (start/stop/rescan/command/lock-mode), giữ `Viewer` chỉ gọi được các `GET`.

| Endpoint | Role tối thiểu |
|---|---|
| `GET /api/servers*` | Viewer |
| `POST /api/servers/rescan` | Operator |
| `POST /api/servers/:id/start\|stop` | Operator |
| `WS command` | Operator |
| `POST /api/system/lock-mode` | Admin |
| `POST /api/auth/change-password` (người khác) | Admin |

**Acceptance criteria Sprint 6:**
- [ ] Tài khoản role `Viewer` gọi `POST /api/servers/:id/start` → 403
- [ ] Tài khoản `Operator` không đổi được `lock-mode` → 403

---

## 7. Sprint 7 — Frontend nối API thật

- `frontend/src/lib/api.ts`: fetch wrapper gọi `/api/*` qua Nginx proxy, tự động gửi cookie (`credentials: "include"`)
- `frontend/src/lib/ws.ts`: hook `useRconSocket(serverId)` kết nối `/ws/rcon`
- Trang `/login`: form gọi `POST /api/auth/login`
- Trang `/servers`: gọi `GET /api/servers`, danh sách + nút Start
- Trang `/servers/[id]`: 5 panel (kết nối, người chơi, log hệ thống, chat, console) — bind vào API/WS đã hoàn thiện ở Sprint 2–4
- `page.tsx` (root): gọi `GET /api/servers/active` lúc load → redirect tương ứng

**Acceptance criteria Sprint 7:**
- [ ] Không còn mock data nào trong `page.tsx`
- [ ] Luồng đăng nhập → chọn server → start → dashboard hoạt động end-to-end trên môi trường thật

---

## 8. Sprint 8 — `git-backup` (làm sau cùng, cần bạn chốt trước)

Chưa đủ dữ kiện để ra chỉ thị chi tiết. Cần bạn trả lời:
1. Backup bằng `git commit` world folder, hay nén + đẩy lên object storage (world Minecraft thường vài trăm MB–vài GB, git không hợp cho binary lớn)?
2. Trigger: sau mỗi lần `stop`, theo lịch (cron), hay cả hai?
3. Nơi lưu: repo Git riêng, GCS bucket, hay ổ đĩa khác trên VM?

---

## Thứ tự thực thi tổng hợp

```
Sprint 1 (DB schema)
   → Sprint 2 (Discovery thật)
      → Sprint 3 (Systemd thật + khoá 1-server)
         → Sprint 4 (RCON thật)
            → Sprint 5 (Audit thật)
               → Sprint 6 (RBAC mở rộng)
                  → Sprint 7 (Frontend nối API)
                     → Sprint 8 (git-backup, cần chốt yêu cầu trước)
```