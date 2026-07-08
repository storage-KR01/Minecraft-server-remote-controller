import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../audit/audit.decorator';
import { ServerOrchestrationService } from './server-orchestration.service';

type LockModeBody = {
  mode: 'locked' | 'unlocked';
};

@Controller()
@Roles('Admin', 'Operator', 'Viewer')
export class SystemdController {
  constructor(private readonly orchestration: ServerOrchestrationService) {}

  @Get('system/lock-mode')
  async getLockMode() {
    return this.orchestration.getLockMode();
  }

  @Post('system/lock-mode')
  @Roles('Admin')
  @Audit({ action: 'system:lock_mode_changed', targetType: 'system' })
  async setLockMode(@Body() body: LockModeBody) {
    return this.orchestration.setLockMode(body.mode);
  }

  @Post('servers/:id/start')
  @Roles('Admin', 'Operator')
  @Audit({ action: 'server:start', targetType: 'server', targetIdParam: 'id' })
  async startServer(@Param('id') id: string) {
    return this.orchestration.startServer(id);
  }

  @Post('servers/:id/stop')
  @Roles('Admin', 'Operator')
  @Audit({ action: 'server:stop', targetType: 'server', targetIdParam: 'id' })
  async stopServer(@Param('id') id: string) {
    return this.orchestration.stopServer(id);
  }

  @Post('servers/:id/restart')
  @Roles('Admin', 'Operator')
  @Audit({ action: 'server:restart', targetType: 'server', targetIdParam: 'id' })
  async restartServer(@Param('id') id: string) {
    return this.orchestration.restartServer(id);
  }

  @Get('servers/:id/status')
  async status(@Param('id') id: string) {
    return this.orchestration.status(id);
  }

  @Get('servers/:id/journal')
  async journal(@Param('id') id: string, @Query('lines') lines?: string) {
    const parsedLines = lines ? Number(lines) : 200;
    return this.orchestration.journal(id, parsedLines);
  }
}