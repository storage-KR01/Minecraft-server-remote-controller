import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  health() {
    return {
      status: 'ok',
      service: 'server-control-center-backend',
      time: new Date().toISOString()
    };
  }
}

