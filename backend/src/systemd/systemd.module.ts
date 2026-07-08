import { Module } from '@nestjs/common';
import { DiscoveryModule } from '../discovery/discovery.module';
import { SystemdController } from './systemd.controller';
import { ServerOrchestrationService } from './server-orchestration.service';
import { SystemdService } from './systemd.service';

@Module({
  imports: [DiscoveryModule],
  controllers: [SystemdController],
  providers: [SystemdService, ServerOrchestrationService],
  exports: [SystemdService, ServerOrchestrationService]
})
export class SystemdModule {}

