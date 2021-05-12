import * as execa from 'execa';
import { UserFriendlyError } from './errors/user_friendly_error';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { log } from './log';

export interface GitServiceOptions {
  repositoryRoot: string;
  preferredRemoteName?: string;
}

export class GitService {
  repositoryRoot: string;

  private readonly preferredRemoteName?: string;

  constructor(options: GitServiceOptions) {
    this.preferredRemoteName = options.preferredRemoteName;
    this.repositoryRoot = options.repositoryRoot;
  }

  private async fetch(cmd: string): Promise<string> {
    const [, ...args] = cmd.trim().split(' ');
    const { stdout } = await execa(gitExtensionWrapper.gitBinaryPath, args, {
      cwd: this.repositoryRoot,
      preferLocal: false,
    });
    return stdout;
  }

  /**
   * Fetches remote tracking branch name of current branch.
   * This should be used in link openers.
   *
   * Fixes #1 where local branch name is renamed and doesn't exists on remote but
   * local branch still tracks another branch on remote.
   */
  async fetchTrackingBranchName(): Promise<string> {
    try {
      const branchName = await this.fetch('git rev-parse --abbrev-ref HEAD');

      try {
        const ref = await this.fetch(`git config --get branch.${branchName}.merge`);

        if (ref) {
          return ref.replace('refs/heads/', '');
        }
      } catch (e) {
        log(`Couldn't find tracking branch. Extension will fallback to branch name ${branchName}`);
      }

      return branchName;
    } catch (e) {
      throw new UserFriendlyError('Cannot get current git branch', e);
    }
  }

  async getRepositoryRootFolder(): Promise<string> {
    return this.fetch('git rev-parse --show-toplevel');
  }
}
