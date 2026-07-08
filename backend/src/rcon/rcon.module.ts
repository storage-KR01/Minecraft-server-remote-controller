import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DiscoveryModule } from '../discovery/discovery.module';
import { PlayersController } from './players.controller';
import { RconGateway } from './rcon.gateway';
import { RconService } from './rcon.service';

@Module({
  imports: [AuthModule, DiscoveryModule, AuditModule],
  controllers: [PlayersController],
  providers: [RconGateway, RconService],
  exports: [RconService]
})
export class RconModule {}

