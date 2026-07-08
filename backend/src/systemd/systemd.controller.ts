import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
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
  async setLockMode(@Body() body: LockModeBody) {
    return this.orchestration.setLockMode(body.mode);
  }

  @Post('servers/:id/start')
  @Roles('Admin', 'Operator')
  async startServer(@Param('id') id: string) {
    return this.orchestration.startServer(id);
  }

  @Post('servers/:id/stop')
  @Roles('Admin', 'Operator')
  async stopServer(@Param('id') id: string) {
    return this.orchestration.stopServer(id);
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