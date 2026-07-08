import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { DatabaseService } from '../database/database.service';

const allowedOperations = new Set(['daemon-reload', 'start', 'stop', 'restart', 'status', 'journal']);
const execFileAsync = promisify(execFile);

@Injectable()
export class SystemdService {
  constructor(private readonly database: DatabaseService) {}

  assertAllowed(operation: string) {
    if (!allowedOperations.has(operation)) {
      throw new BadRequestException('Unsupported systemd operation');
    }
  }

  listAllowedOperations() {
    return [...allowedOperations];
  }

  async run(operation: 'daemon-reload' | 'start' | 'stop' | 'restart', unit?: string) {
    this.assertAllowed(operation);

    if (operation !== 'daemon-reload') {
      if (!unit) {
        throw new BadRequestException('systemd unit is required');
      }

      await this.assertKnownUnit(unit);
    }

    const args = operation === 'daemon-reload' ? [operation] : [operation, unit as string];

    try {
      const { stdout, stderr } = await execFileAsync('systemctl', args, {
        timeout: 15000,
        maxBuffer: 1024 * 1024
      });
      return {
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode: 0
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'systemctl failed';
      throw new BadRequestException(message);
    }
  }

  async status(unit: string) {
    await this.assertKnownUnit(unit);

    try {
      const { stdout, stderr } = await execFileAsync('systemctl', ['status', '--no-pager', unit], {
        timeout: 15000,
        maxBuffer: 1024 * 1024
      });
      return {
        stdout: stdout ?? '',
        stderr: stderr ?? '',
        exitCode: 0
      };
    } catch (error: any) {
      return {
        stdout: error?.stdout ?? '',
        stderr: error?.stderr ?? error?.message ?? 'systemctl status failed',
        exitCode: typeof error?.code === 'number' ? error.code : 1
      };
    }
  }

  async journal(unit: string, lines = 200) {
    await this.assertKnownUnit(unit);

    const parsedLines = Number.isFinite(lines) && lines > 0 ? Math.min(Math.floor(lines), 1000) : 200;

    try {
      const { stdout } = await execFileAsync(
        'journalctl',
        ['-u', unit, '-n', String(parsedLines), '--no-pager'],
        {
          timeout: 15000,
          maxBuffer: 1024 * 1024
        }
      );

      return stdout ?? '';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'journalctl failed';
      throw new BadRequestException(message);
    }
  }

  private async assertKnownUnit(unit: string) {
    const result = await this.database.query('SELECT 1 FROM servers WHERE systemd_unit = $1', [unit]);
    if (result.rowCount === 0) {
      throw new BadRequestException('Unit không nằm trong danh sách server đã quét');
    }
  }
}

