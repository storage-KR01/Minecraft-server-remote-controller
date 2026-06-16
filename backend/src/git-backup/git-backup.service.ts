import { Injectable } from '@nestjs/common';

@Injectable()
export class GitBackupService {
  plannedSteps() {
    return [
      'stop server',
      'verify stopped',
      'detect git repository',
      'stage changes',
      'commit if needed',
      'detect branch',
      'detect remote',
      'push',
      'return to server selection'
    ];
  }
}

