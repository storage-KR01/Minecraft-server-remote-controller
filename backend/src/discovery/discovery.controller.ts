import { Controller, Get, Param, Post } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../audit/audit.decorator';

@Controller('servers')
@Roles('Admin', 'Operator', 'Viewer')
export class DiscoveryController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  async listServers() {
    return {
      servers: (await this.discovery.discover()).map(({ rconPasswordEnc, ...server }) => server)
    };
  }

  @Post('rescan')
  @Roles('Admin', 'Operator')
  @Audit({ action: 'discovery:rescan', targetType: 'system' })
  async rescan() {
    return {
      servers: (await this.discovery.rescan()).map(({ rconPasswordEnc, ...server }) => server)
    };
  }

  @Get('active')
  async active() {
    const result = await this.discovery.getActive();
    return {
      state: result.state,
      server: result.server ? (({ rconPasswordEnc, ...server }) => server)(result.server) : null
    };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    return {
      server: (({ rconPasswordEnc, ...server }) => server)(await this.discovery.getById(id))
    };
  }
}

