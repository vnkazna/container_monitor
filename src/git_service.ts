import * as execa from 'execa';
import { parseGitRemote, GitRemote } from './git/git_remote_parser';
import { getInstanceUrl } from './utils/get_instance_url';

export interface GitServiceOptions {
  workspaceFolder: string;
  remoteName?: string;
  pipelineGitRemoteName?: string;
  log: (line: string) => void;
}

export class GitService {
  workspaceFolder: string;

  remoteName?: string;

  pipelineGitRemoteName?: string;

  log: (line: string) => void;

  constructor(options: GitServiceOptions) {
    this.remoteName = options.remoteName;
    this.pipelineGitRemoteName = options.pipelineGitRemoteName;
    this.workspaceFolder = options.workspaceFolder;
    this.log = options.log;
  }

  private async fetch(cmd: string): Promise<string | null> {
    const [git, ...args] = cmd.trim().split(' ');
    try {
      const { stdout } = await execa(git, args, {
        cwd: this.workspaceFolder,
        preferLocal: false,
      });
      return stdout;
    } catch (e) {
      this.log(`${e.message}\n${e.stack}`);
    }
    return null;
  }

  private async fetchRemoteUrl(remoteName = ''): Promise<GitRemote | null> {
    // If remote name isn't provided, the command returns default remote for the current branch
    const getUrlForRemoteName = async (name: string) =>
      this.fetch(`git ls-remote --get-url ${name}`);

    const getFirstRemoteName = async () => {
      const multilineRemotes = await this.fetch('git remote');
      return (multilineRemotes || '').split('\n')[0];
    };

    let remoteUrl = await getUrlForRemoteName(remoteName);
    if (!remoteUrl) {
      // If there's no remote now, that means that there's no origin and no `remote.pushDefault` config.
      remoteUrl = await getUrlForRemoteName(await getFirstRemoteName());
    }

    if (remoteUrl) {
      return parseGitRemote(await getInstanceUrl(this.workspaceFolder), remoteUrl);
    }

    return null;
  }

  async fetchGitRemote(): Promise<GitRemote | null> {
    return await this.fetchRemoteUrl(this.remoteName);
  }

  async fetchBranchName(): Promise<string | null> {
    return await this.fetch('git rev-parse --abbrev-ref HEAD');
  }

  async fetchLastCommitId(): Promise<string | null> {
    return await this.fetch('git log --format=%H -n 1');
  }

  async fetchGitRemotePipeline(): Promise<GitRemote | null> {
    return await this.fetchRemoteUrl(this.pipelineGitRemoteName);
  }

  /**
   * Fetches remote tracking branch name of current branch.
   * This should be used in link openers.
   *
   * Fixes #1 where local branch name is renamed and doesn't exists on remote but
   * local branch still tracks another branch on remote.
   */
  async fetchTrackingBranchName(): Promise<string | null> {
    const branchName = await this.fetchBranchName();

    try {
      const ref = await this.fetch(`git config --get branch.${branchName}.merge`);

      if (ref) {
        return ref.replace('refs/heads/', '');
      }
    } catch (e) {
      this.log(
        `Couldn't find tracking branch. Extension will fallback to branch name ${branchName}`,
      );
      this.log(`${e.message}\n${e.stack}`);
    }

    return branchName;
  }
}
