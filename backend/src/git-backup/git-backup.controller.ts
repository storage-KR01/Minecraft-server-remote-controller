import { Body, Controller, Get, Post } from '@nestjs/common';
import { Audit } from '../audit/audit.decorator';
import { Roles } from '../auth/roles.decorator';
import { GitBackupService } from './git-backup.service';

type BackupBody = {
  message?: string;
};

@Controller('git-backup')
@Roles('Admin')
export class GitBackupController {
  constructor(private readonly gitBackup: GitBackupService) {}

  @Get('steps')
  getSteps() {
    return {
      steps: this.gitBackup.plannedSteps()
    };
  }

  @Post('run')
  @Audit({ action: 'git_backup:run', targetType: 'repository' })
  async run(@Body() body: BackupBody) {
    return this.gitBackup.runBackup(body.message);
  }
}