import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      service: 'server-control-center-backend',
      time: new Date().toISOString()
    };
  }
}

