import { BadRequestException, Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

type BackupResult = {
  repoPath: string;
  branch: string;
  remote: string;
  changed: boolean;
  committed: boolean;
  pushed: boolean;
  commitMessage?: string;
  commitHash?: string;
  summary: string;
};

@Injectable()
export class GitBackupService {
  plannedSteps() {
    return [
      'detect configured repository path',
      'verify git repository',
      'stage tracked and untracked changes',
      'skip commit if no changes exist',
      'create a timestamped commit',
      'detect current branch and remote',
      'push to origin',
      'return backup summary'
    ];
  }

  async runBackup(commitMessage?: string): Promise<BackupResult> {
    const repoPath = process.env.GIT_BACKUP_REPO_PATH ?? '/workspace/server-control-center';
    const commitPrefix = process.env.GIT_BACKUP_COMMIT_PREFIX ?? 'scc backup';

    if (!existsSync(repoPath)) {
      throw new BadRequestException(`Repository path not found: ${repoPath}`);
    }

    const gitRoot = await this.git(repoPath, ['rev-parse', '--show-toplevel']);
    const branch = (await this.git(repoPath, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
    const remote = (await this.git(repoPath, ['remote', 'get-url', 'origin'])).trim();

    const statusBefore = await this.git(repoPath, ['status', '--short']);
    const changed = statusBefore.trim().length > 0;
    if (!changed) {
      return {
        repoPath: gitRoot.trim() || repoPath,
        branch,
        remote,
        changed: false,
        committed: false,
        pushed: false,
        summary: 'No changes to back up'
      };
    }

    await this.git(repoPath, ['add', '-A']);

    const commitText = (commitMessage?.trim() || `${commitPrefix} ${new Date().toISOString()}`).slice(0, 180);
    const stagedDiff = await this.git(repoPath, ['diff', '--cached', '--name-only']);
    if (!stagedDiff.trim()) {
      return {
        repoPath: gitRoot.trim() || repoPath,
        branch,
        remote,
        changed: false,
        committed: false,
        pushed: false,
        summary: 'Nothing staged for commit'
      };
    }

    await this.git(repoPath, ['commit', '-m', commitText]);
    const commitHash = (await this.git(repoPath, ['rev-parse', '--short', 'HEAD'])).trim();
    await this.git(repoPath, ['push', 'origin', branch]);

    return {
      repoPath: gitRoot.trim() || repoPath,
      branch,
      remote,
      changed: true,
      committed: true,
      pushed: true,
      commitMessage: commitText,
      commitHash,
      summary: `Committed ${commitHash} and pushed to ${branch}`
    };
  }

  private async git(cwd: string, args: string[]) {
    try {
      const { stdout, stderr } = await execFileAsync('git', args, {
        cwd,
        maxBuffer: 1024 * 1024,
        timeout: 30000
      });
      return `${stdout ?? ''}${stderr ?? ''}`;
    } catch (error: any) {
      const message = error?.stderr || error?.stdout || error?.message || 'git command failed';
      throw new BadRequestException(message);
    }
  }
}

