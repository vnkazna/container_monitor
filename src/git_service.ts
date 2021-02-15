import * as execa from 'execa';
import { UserFriendlyError } from './errors/user_friendly_error';
import { parseGitRemote, GitRemote } from './git/git_remote_parser';
import { log } from './log';
import { getInstanceUrl } from './utils/get_instance_url';

export interface GitServiceOptions {
  workspaceFolder: string;
  preferredRemoteName?: string;
}

export class GitService {
  workspaceFolder: string;

  private readonly preferredRemoteName?: string;

  constructor(options: GitServiceOptions) {
    this.preferredRemoteName = options.preferredRemoteName;
    this.workspaceFolder = options.workspaceFolder;
  }

  private async fetch(cmd: string): Promise<string> {
    const [git, ...args] = cmd.trim().split(' ');
    const { stdout } = await execa(git, args, {
      cwd: this.workspaceFolder,
      preferLocal: false,
    });
    return stdout;
  }

  async fetchGitRemote(remoteName = this.preferredRemoteName): Promise<GitRemote> {
    // If remote name isn't provided, the command returns default remote for the current branch
    // if there's no default branch, the command fails but that's part of the normal flow and it can't throw
    const getUrlForRemoteName = async (name: string) =>
      this.fetch(`git ls-remote --get-url ${name}`).catch(e => null);

    const getFirstRemoteName = async () => {
      const multilineRemotes = await this.fetch('git remote');
      return multilineRemotes.split('\n')[0];
    };

    let remoteUrl = await getUrlForRemoteName(remoteName ?? '');
    if (!remoteUrl) {
      // If there's no remote now, that means that there's no origin and no `remote.pushDefault` config.
      remoteUrl = await getUrlForRemoteName(await getFirstRemoteName());
    }

    if (remoteUrl) {
      const parsedRemote = parseGitRemote(remoteUrl, await getInstanceUrl(this.workspaceFolder));
      if (!parsedRemote) {
        throw new Error(`git remote "${remoteUrl}" could not be parsed`);
      }
      return parsedRemote;
    }
    throw new Error('"git remote" does not return any URL');
  }

  async fetchLastCommitId(): Promise<string> {
    return this.fetch('git log --format=%H -n 1');
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

  async getFileContent(path: string, sha: string): Promise<string | null> {
    // even on Windows, the git show command accepts only POSIX paths
    const posixPath = path.replace(/\\/g, '/');
    const pathWithoutFirstSlash = posixPath.replace(/^\//, '');
    try {
      return await this.fetch(`git show ${sha}:${pathWithoutFirstSlash}`);
    } catch (e) {
      // null sufficiently signalises that the file has not been found
      // this scenario is going to happen often (for open and squashed MRs)
      return null;
    }
  }
}
