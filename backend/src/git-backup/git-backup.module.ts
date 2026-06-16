import { Module } from '@nestjs/common';
import { GitBackupService } from './git-backup.service';

@Module({
  providers: [GitBackupService],
  exports: [GitBackupService]
})
export class GitBackupModule {}

