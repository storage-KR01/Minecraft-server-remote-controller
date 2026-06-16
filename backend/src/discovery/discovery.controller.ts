import { Controller, Get } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';

@Controller('servers')
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  async listServers() {
    return {
      servers: await this.discovery.discover()
    };
  }
}

