import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { GitBackupController } from './git-backup.controller';
import { GitBackupService } from './git-backup.service';

@Module({
  imports: [AuditModule],
  controllers: [GitBackupController],
  providers: [GitBackupService],
  exports: [GitBackupService]
})
export class GitBackupModule {}

