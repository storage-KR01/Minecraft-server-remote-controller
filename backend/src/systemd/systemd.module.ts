import { Module } from '@nestjs/common';
import { SystemdService } from './systemd.service';

@Module({
  providers: [SystemdService],
  exports: [SystemdService]
})
export class SystemdModule {}

