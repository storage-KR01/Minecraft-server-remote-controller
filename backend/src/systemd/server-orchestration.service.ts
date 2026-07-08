import { ConflictException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { DiscoveryService } from '../discovery/discovery.service';
import { SystemdService } from './systemd.service';

type SystemStateRow = {
  active_server_id: string | null;
  lock_mode: 'locked' | 'unlocked';
};

@Injectable()
export class ServerOrchestrationService implements OnModuleInit {
  private readonly logger = new Logger(ServerOrchestrationService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly discovery: DiscoveryService,
    private readonly systemd: SystemdService
  ) {}

  async onModuleInit() {
    const state = await this.getState();
    if (!state.active_server_id) {
      return;
    }

    try {
      const server = await this.discovery.getById(state.active_server_id);
      await this.systemd.run('start', server.systemdUnit);
      this.logger.log(`Resumed active server ${server.id}`);
    } catch (error) {
      this.logger.warn(`Failed to resume active server: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getLockMode() {
    const state = await this.getState();
    return { mode: state.lock_mode };
  }

  async setLockMode(mode: 'locked' | 'unlocked') {
    await this.database.query('UPDATE system_state SET lock_mode = $1, updated_at = now() WHERE id = 1', [mode]);
    return { mode };
  }

  async startServer(serverId: string) {
    const server = await this.discovery.getById(serverId);
    const state = await this.getState();

    if (state.lock_mode === 'locked' && state.active_server_id && state.active_server_id !== serverId) {
      throw new ConflictException(
        `Server '${state.active_server_id}' đang chạy. Tắt trước khi bật server khác.`
      );
    }

    await this.systemd.run('start', server.systemdUnit);
    await this.database.query('UPDATE system_state SET active_server_id = $1, updated_at = now() WHERE id = 1', [serverId]);

    return {
      status: 'started',
      serverId,
      systemdUnit: server.systemdUnit
    };
  }

  async stopServer(serverId: string) {
    const server = await this.discovery.getById(serverId);

    await this.systemd.run('stop', server.systemdUnit);
    await this.database.query(
      `UPDATE system_state
       SET active_server_id = CASE WHEN active_server_id = $1 THEN NULL ELSE active_server_id END,
           updated_at = now()
       WHERE id = 1`,
      [serverId]
    );

    return {
      status: 'stopped',
      serverId,
      systemdUnit: server.systemdUnit
    };
  }

  async status(serverId: string) {
    const server = await this.discovery.getById(serverId);
    const result = await this.systemd.status(server.systemdUnit);

    return {
      serverId,
      systemdUnit: server.systemdUnit,
      ...result
    };
  }

  async journal(serverId: string, lines = 200) {
    const server = await this.discovery.getById(serverId);
    const output = await this.systemd.journal(server.systemdUnit, lines);

    return {
      serverId,
      systemdUnit: server.systemdUnit,
      lines,
      output
    };
  }

  private async getState(): Promise<SystemStateRow> {
    const result = await this.database.query<SystemStateRow>(
      'SELECT active_server_id, lock_mode FROM system_state WHERE id = 1'
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('system_state row missing');
    }

    return row;
  }
}