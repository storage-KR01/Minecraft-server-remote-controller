# Kiến trúc hệ thống quản lý Minecraft Server từ xa

> Stack hiện tại trong repo: **Backend: NestJS (TypeScript)** · **Frontend: Next.js 15 + React 19** · **Database: PostgreSQL** · **Deploy: Docker Compose + host Nginx**

## 1. Mục tiêu & ranh giới hệ thống

| Nguyên tắc | Ý nghĩa |
|---|---|
| **Web không chạm trực tiếp OS** | Giao diện chỉ gọi API và WebSocket của backend; không điều khiển systemd, file hệ thống hay RCON trực tiếp từ trình duyệt |
| **Backend là điểm điều phối duy nhất** | Mọi logic auth, discovery, audit, RCON và hệ thống chạy qua một backend NestJS |
| **Discovery là runtime feature** | Danh sách server phải được phát hiện từ môi trường máy chủ, không hardcode trong frontend |
| **Session qua cookie httpOnly** | Đăng nhập tạo session token lưu trong cookie `scc_session` |
| **Triển khai bằng Docker Compose** | Toàn bộ app stack chạy qua `docker compose`, còn Nginx host làm reverse proxy public |

## 2. Tổng quan kiến trúc

```
Browser
  │ HTTPS / WSS
  ▼
Host Nginx
  │ proxy to 127.0.0.1:18080
  ▼
Docker nginx service
  │ serves Next.js app and proxies /api, /ws
  ▼
Backend NestJS (port 3001 inside Docker)
  │ PostgreSQL, auth, discovery, systemd, audit, RCON gateway
  ▼
PostgreSQL container
```

### Các thành phần trong repo

- [backend/](backend/) chứa NestJS app với các module `auth`, `database`, `discovery`, `systemd`, `rcon`, `audit`, `git-backup`, `health`.
- [frontend/](frontend/) là Next.js App Router, hiện đang render giao diện dashboard khung và sẽ gọi API backend.
- [docker-compose.yml](docker-compose.yml) định nghĩa 4 service: `postgres`, `backend`, `frontend`, `nginx`.
- [deploy/nginx/scc.liems.io.vn.conf](deploy/nginx/scc.liems.io.vn.conf) là cấu hình Nginx host để đưa public traffic vào cổng `18080`.

## 3. Runtime & deploy hiện tại

`docker-compose.yml` cho thấy triển khai thực tế là:

- `postgres`: PostgreSQL 16, dữ liệu giữ trong volume `postgres-data`.
- `backend`: build từ [backend/Dockerfile](backend/Dockerfile) và mount một số đường dẫn host để có thể đọc trạng thái systemd/journal khi cần.
- `frontend`: build từ [frontend/Dockerfile](frontend/Dockerfile) bằng Next.js.
- `nginx`: container nginx public lắng nghe trên `${PUBLIC_BIND_ADDRESS}:${PUBLIC_HTTP_PORT}`; mặc định là `127.0.0.1:18080`.

File [/.env.example](.env.example) hiện là nguồn cấu hình chuẩn cho local/prod, gồm các biến chính:

```env
POSTGRES_DB=server_control_center
POSTGRES_USER=scc
POSTGRES_PASSWORD=change-me
DATABASE_URL=postgresql://scc:change-me@postgres:5432/server_control_center
JWT_SECRET=replace-with-a-long-random-secret
COOKIE_SECRET=replace-with-another-long-random-secret
INITIAL_ADMIN_USERNAME=admin
NEXT_PUBLIC_APP_NAME=Server Control Center
BACKEND_PORT=3001
FRONTEND_PORT=3000
PUBLIC_BIND_ADDRESS=127.0.0.1
PUBLIC_HTTP_PORT=18080
```

## 4. Backend: những gì đã có

Backend đang dùng NestJS với global prefix `/api` và các middleware cơ bản như `helmet`, `cookie-parser`, `ValidationPipe`.

### Auth

Auth hiện lưu session trong DB và trả cookie `scc_session`.

Endpoints đã có:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

Luồng đăng nhập hiện tại:

- User nhập username/password.
- Backend xác thực bằng bcrypt.
- Nếu hợp lệ, backend tạo session token JWT, lưu hash của token vào bảng `sessions`.
- Cookie `scc_session` được set là `httpOnly`, `sameSite: strict`, `secure` khi production.

Role hiện tại trong code là:

- `Admin`
- `Operator`
- `Viewer`

### Health

- `GET /api/health`

Response trả về trạng thái service và timestamp hiện tại.

### Discovery

- `GET /api/servers`

Module discovery đã có scaffold, nhưng implementation hiện tại vẫn trả danh sách rỗng. Đây là phần đang chờ hiện thực hóa logic quét systemd/filesystem.

### WebSocket

Gateway hiện tại mở namespace:

- `/ws/rcon`

Sự kiện `command` đã được khai báo, nhưng phần thực thi RCON vẫn là khung chờ. Hiện code trả về thông báo rằng việc chạy lệnh RCON sẽ làm sau khi discovery và RBAC hoàn thiện.

## 5. Database & state

Repo đang dùng PostgreSQL qua `pg` pool trong backend. Mục tiêu lưu trữ gồm:

- `users`
- `sessions`
- audit log
- discovery cache
- trạng thái vận hành của hệ thống

Về mặt kiến trúc, DB là nguồn sự thật cho session và lịch sử vận hành, không đẩy state này về frontend.

## 6. Systemd, discovery và RCON

Đây là ba vùng nghiệp vụ chính của controller.

- `systemd`: backend sẽ là nơi duy nhất gọi `start`, `stop`, `restart`, `status` và `journal` cho các server Minecraft.
- `discovery`: backend cần phát hiện server runtime từ host environment, sau đó map mỗi server với systemd unit tương ứng.
- `rcon`: backend sẽ đóng vai trò trung gian cho lệnh điều hành Minecraft, thay vì để UI chạm trực tiếp vào server.

Tài liệu trước đây mô tả một controller Python/FastAPI, nhưng repo hiện tại không còn theo hướng đó. Phần mô tả chuẩn nên là: backend NestJS làm controller trung tâm, còn discovery/systemd/RCON là các module của backend này.

## 7. Frontend

Frontend hiện là Next.js App Router với giao diện dashboard khung. Trang chủ trong [frontend/src/app/page.tsx](frontend/src/app/page.tsx) đang thể hiện các khối chức năng như discovery, database, security và operations, nhưng chưa nối dữ liệu thật.

### Cấu trúc chính

```text
frontend/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
└── lib/
```

### Hướng triển khai UI

- React app chỉ gọi backend qua `/api` và `/ws`.
- UI cần tôn trọng session cookie, không tự giữ JWT ở local storage.
- Các màn hình chính nên bám theo các luồng: login, server list, server detail, console, audit.

## 8. Reverse proxy và public entrypoint

File Nginx host hiện tại proxy toàn bộ traffic vào `127.0.0.1:18080`.

Điểm đáng chú ý:

- `/` đi vào frontend.
- `/api/` đi vào backend.
- `/ws/` đi vào websocket namespace của backend.
- TLS được terminate ở host Nginx / Certbot, không expose trực tiếp container ra internet.

Đây là mô hình đúng với README của repo và phù hợp với cách deploy trên VPS Linux.

## 9. Trạng thái hiện tại so với mục tiêu

### Đã có trong repo

- Docker Compose stack hoàn chỉnh.
- Backend NestJS có auth, health, discovery scaffold, systemd service, RCON gateway, database module.
- Frontend Next.js có giao diện khởi tạo.
- Nginx host config cho public reverse proxy.

### Chưa hoàn thiện

- Discovery thực sự cho Minecraft servers chưa có logic quét thật.
- RCON execution chưa được nối vào gateway.
- Systemd operation API chưa được expose đầy đủ.
- Audit flow và git-backup vẫn cần hoàn chỉnh theo yêu cầu sản phẩm.

## 10. Định hướng tiếp theo

- Hiện thực hóa discovery để trả về danh sách server thật từ môi trường host.
- Gắn auth guard và role-based access control cho các endpoint vận hành.
- Bổ sung API điều khiển systemd và RCON.
- Nối frontend với các endpoint backend và WebSocket.
- Hoàn thiện audit log cho thao tác quản trị.
