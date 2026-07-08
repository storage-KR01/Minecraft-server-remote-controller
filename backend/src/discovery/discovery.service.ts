import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createCipheriv, createHash, randomBytes } from 'crypto';
import { DatabaseService } from '../database/database.service';

export type DiscoveredServer = {
  id: string;
  path: string;
  displayName: string;
  gamePort: number | null;
  rconPort: number | null;
  rconPasswordEnc: string | null;
  systemdUnit: string;
  lastScannedAt: string;
  hasServerProperties: boolean;
  hasEula: boolean;
  hasControllerMeta: boolean;
  hasSystemdUnit: boolean;
};

type ServerRow = {
  id: string;
  path: string;
  display_name: string;
  game_port: number | null;
  rcon_port: number | null;
  rcon_password_enc: string | null;
  systemd_unit: string;
  last_scanned_at: string;
};

type SystemStateRow = {
  active_server_id: string | null;
  lock_mode: 'locked' | 'unlocked';
  updated_at: string;
};

const PREFIX = 'mc-server-';
const EXCLUDE_DIRS = new Set(['proc', 'sys', 'dev', 'snap', '.git', 'node_modules']);

function parseServerProperties(contents: string): Record<string, string> {
  const properties: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (key) {
      properties[key] = value;
    }
  }

  return properties;
}

function deriveKey(secret?: string) {
  if (!secret) {
    return null;
  }

  return createHash('sha256').update(secret).digest();
}

function encryptSecret(secret: string | null): string | null {
  if (!secret) {
    return null;
  }

  const key = deriveKey(process.env.DATA_ENCRYPTION_KEY);
  if (!key) {
    return null;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['enc:v1', iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

function toServerRow(server: DiscoveredServer): ServerRow {
  return {
    id: server.id,
    path: server.path,
    display_name: server.displayName,
    game_port: server.gamePort,
    rcon_port: server.rconPort,
    rcon_password_enc: server.rconPasswordEnc,
    systemd_unit: server.systemdUnit,
    last_scanned_at: server.lastScannedAt
  };
}

@Injectable()
export class DiscoveryService {
  constructor(private readonly database: DatabaseService) {}

  async rescan(): Promise<DiscoveredServer[]> {
    const discovered = this.scanFilesystem();
    const rows = discovered.map(toServerRow);
    const serverIds = rows.map((server) => server.id);

    await this.database.withTransaction(async (client) => {
      for (const server of rows) {
        await client.query(
          `INSERT INTO servers (id, path, display_name, game_port, rcon_port, rcon_password_enc, systemd_unit, last_scanned_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, now())
           ON CONFLICT (id) DO UPDATE SET
             path = EXCLUDED.path,
             display_name = EXCLUDED.display_name,
             game_port = EXCLUDED.game_port,
             rcon_port = EXCLUDED.rcon_port,
             rcon_password_enc = EXCLUDED.rcon_password_enc,
             systemd_unit = EXCLUDED.systemd_unit,
             last_scanned_at = now()`,
          [
            server.id,
            server.path,
            server.display_name,
            server.game_port,
            server.rcon_port,
            server.rcon_password_enc,
            server.systemd_unit
          ]
        );
      }

      if (serverIds.length > 0) {
        await client.query('DELETE FROM servers WHERE NOT (id = ANY($1::text[]))', [serverIds]);
      } else {
        await client.query('DELETE FROM servers');
      }

      await client.query('UPDATE system_state SET updated_at = now() WHERE id = 1');
    });

    return this.discover();
  }

  async discover(): Promise<DiscoveredServer[]> {
    const result = await this.database.query<ServerRow>(
      `SELECT id, path, display_name, game_port, rcon_port, rcon_password_enc, systemd_unit, last_scanned_at
       FROM servers
       ORDER BY display_name ASC, id ASC`
    );

    return result.rows.map((row) => ({
      id: row.id,
      path: row.path,
      displayName: row.display_name,
      gamePort: row.game_port,
      rconPort: row.rcon_port,
      rconPasswordEnc: row.rcon_password_enc,
      systemdUnit: row.systemd_unit,
      lastScannedAt: row.last_scanned_at,
      hasServerProperties: existsSync(join(row.path, 'server.properties')),
      hasEula: existsSync(join(row.path, 'eula.txt')),
      hasControllerMeta: existsSync(join(row.path, 'controller.meta.json')),
      hasSystemdUnit: existsSync(join('/host/etc/systemd/system', `${row.systemd_unit}`))
    }));
  }

  async getById(id: string): Promise<DiscoveredServer> {
    const result = await this.database.query<ServerRow>(
      `SELECT id, path, display_name, game_port, rcon_port, rcon_password_enc, systemd_unit, last_scanned_at
       FROM servers
       WHERE id = $1`,
      [id]
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException('Server not found');
    }

    return {
      id: row.id,
      path: row.path,
      displayName: row.display_name,
      gamePort: row.game_port,
      rconPort: row.rcon_port,
      rconPasswordEnc: row.rcon_password_enc,
      systemdUnit: row.systemd_unit,
      lastScannedAt: row.last_scanned_at,
      hasServerProperties: existsSync(join(row.path, 'server.properties')),
      hasEula: existsSync(join(row.path, 'eula.txt')),
      hasControllerMeta: existsSync(join(row.path, 'controller.meta.json')),
      hasSystemdUnit: existsSync(join('/host/etc/systemd/system', `${row.systemd_unit}`))
    };
  }

  async getActive(): Promise<{ state: SystemStateRow; server: DiscoveredServer | null }> {
    const result = await this.database.query<ServerRow & SystemStateRow>(
      `SELECT
         ss.active_server_id,
         ss.lock_mode,
         ss.updated_at,
         s.id,
         s.path,
         s.display_name,
         s.game_port,
         s.rcon_port,
         s.rcon_password_enc,
         s.systemd_unit,
         s.last_scanned_at
       FROM system_state ss
       LEFT JOIN servers s ON s.id = ss.active_server_id
       WHERE ss.id = 1`
    );

    const row = result.rows[0];
    if (!row) {
      throw new BadRequestException('system_state row missing');
    }

    return {
      state: {
        active_server_id: row.active_server_id,
        lock_mode: row.lock_mode,
        updated_at: row.updated_at
      },
      server: row.id
        ? {
            id: row.id,
            path: row.path,
            displayName: row.display_name,
            gamePort: row.game_port,
            rconPort: row.rcon_port,
            rconPasswordEnc: row.rcon_password_enc,
            systemdUnit: row.systemd_unit,
            lastScannedAt: row.last_scanned_at,
            hasServerProperties: existsSync(join(row.path, 'server.properties')),
            hasEula: existsSync(join(row.path, 'eula.txt')),
            hasControllerMeta: existsSync(join(row.path, 'controller.meta.json')),
            hasSystemdUnit: existsSync(join('/host/etc/systemd/system', `${row.systemd_unit}`))
          }
        : null
    };
  }

  private scanFilesystem(): DiscoveredServer[] {
    const roots = (process.env.MC_SEARCH_ROOTS ?? '/host/home,/host/opt,/host/srv')
      .split(',')
      .map((root) => root.trim())
      .filter(Boolean);
    const maxDepth = Number(process.env.MC_SCAN_MAX_DEPTH ?? 6);
    const results: DiscoveredServer[] = [];

    for (const root of roots) {
      this.walkRoot(root, 0, maxDepth, results);
    }

    return results;
  }

  private walkRoot(currentPath: string, depth: number, maxDepth: number, results: DiscoveredServer[]) {
    if (depth > maxDepth || !existsSync(currentPath)) {
      return;
    }

    let entries;
    try {
      entries = readdirSync(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name) || (!entry.isDirectory() && !entry.isSymbolicLink())) {
        continue;
      }

      const fullPath = join(currentPath, entry.name);
      let stats;
      try {
        stats = statSync(fullPath);
      } catch {
        continue;
      }

      if (!stats.isDirectory()) {
        continue;
      }

      if (entry.name.startsWith(PREFIX)) {
        const server = this.extractServer(fullPath, entry.name);
        if (server) {
          results.push(server);
        }
        continue;
      }

      this.walkRoot(fullPath, depth + 1, maxDepth, results);
    }
  }

  private extractServer(fullPath: string, dirName: string): DiscoveredServer | null {
    const hasServerProperties = existsSync(join(fullPath, 'server.properties'));
    const hasEula = existsSync(join(fullPath, 'eula.txt'));
    const hasControllerMeta = existsSync(join(fullPath, 'controller.meta.json'));
    const hasSystemdUnit = existsSync(join('/host/etc/systemd/system', `${dirName}.service`));

    if (!hasServerProperties && !hasEula && !hasControllerMeta && !hasSystemdUnit) {
      return null;
    }

    const properties = hasServerProperties
      ? parseServerProperties(readFileSync(join(fullPath, 'server.properties'), 'utf8'))
      : {};

    let override: Record<string, unknown> = {};
    if (hasControllerMeta) {
      try {
        override = JSON.parse(readFileSync(join(fullPath, 'controller.meta.json'), 'utf8')) as Record<string, unknown>;
      } catch {
        override = {};
      }
    }

    const displayName = typeof override.display_name === 'string' && override.display_name.trim()
      ? override.display_name.trim()
      : dirName.replace(PREFIX, '');
    const rconPassword = typeof override.rcon_password === 'string' && override.rcon_password.trim()
      ? override.rcon_password.trim()
      : typeof properties['rcon.password'] === 'string'
        ? properties['rcon.password']
        : null;

    return {
      id: dirName,
      path: fullPath,
      displayName,
      gamePort: properties['server-port'] ? Number(properties['server-port']) || null : null,
      rconPort: properties['rcon.port'] ? Number(properties['rcon.port']) || null : null,
      rconPasswordEnc: encryptSecret(rconPassword),
      systemdUnit: `${dirName}.service`,
      lastScannedAt: new Date().toISOString(),
      hasServerProperties,
      hasEula,
      hasControllerMeta,
      hasSystemdUnit
    };
  }
}

