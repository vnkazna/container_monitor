import * as execa from 'execa';
import * as url from 'url';
import { GITLAB_COM_URL } from './constants';
import { parseGitRemote, GitRemote } from './git/git_remote_parser';

interface TokenService {
  getInstanceUrls(): string[];
}

export interface GitServiceOptions {
  workspaceFolder: string;
  instanceUrl?: string;
  remoteName?: string;
  pipelineGitRemoteName?: string;
  tokenService: TokenService;
  log: (line: string) => void;
}

export class GitService {
  workspaceFolder: string;

  instanceUrl?: string;

  remoteName?: string;

  pipelineGitRemoteName?: string;

  tokenService: TokenService;

  log: (line: string) => void;

  constructor(options: GitServiceOptions) {
    this.instanceUrl = options.instanceUrl;
    this.remoteName = options.remoteName;
    this.pipelineGitRemoteName = options.pipelineGitRemoteName;
    this.workspaceFolder = options.workspaceFolder;
    this.tokenService = options.tokenService;
    this.log = options.log;
  }

  private async fetch(cmd: string): Promise<string | null> {
    const [git, ...args] = cmd.trim().split(' ');
    let currentWorkspaceFolder = this.workspaceFolder;

    if (currentWorkspaceFolder == null) {
      currentWorkspaceFolder = '';
    }
    try {
      const { stdout } = await execa(git, args, {
        cwd: currentWorkspaceFolder,
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
      return parseGitRemote(await this.fetchCurrentInstanceUrl(), remoteUrl);
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

  private async fetchGitRemoteUrls(): Promise<string[]> {
    const fetchGitRemotesVerbose = async (): Promise<string[]> => {
      const output = await this.fetch('git remote -v');

      return (output || '').split('\n');
    };

    const parseRemoteFromVerboseLine = (line: string) => {
      // git remote -v output looks like
      // origin[TAB]git@gitlab.com:gitlab-org/gitlab-vscode-extension.git[WHITESPACE](fetch)
      // the interesting part is surrounded by a tab symbol and a whitespace

      return line.split(/\t| /)[1];
    };

    const remotes = await fetchGitRemotesVerbose();
    const remoteUrls = remotes.map(remote => parseRemoteFromVerboseLine(remote)).filter(Boolean);

    // git remote -v returns a (fetch) and a (push) line for each remote,
    // so we need to remove duplicates
    return [...new Set(remoteUrls)];
  }

  private async intersectionOfInstanceAndTokenUrls() {
    const uriHostname = (uri: string) => url.parse(uri).host;

    const instanceUrls = this.tokenService.getInstanceUrls();
    const gitRemotes = await this.fetchGitRemoteUrls();
    const gitRemoteHosts = gitRemotes.map(uriHostname);

    return instanceUrls.filter(host => gitRemoteHosts.includes(uriHostname(host)));
  }

  private async heuristicInstanceUrl() {
    // if the intersection of git remotes and configured PATs exists and is exactly
    // one hostname, use it
    const intersection = await this.intersectionOfInstanceAndTokenUrls();
    if (intersection.length === 1) {
      const heuristicUrl = intersection[0];
      this.log(
        `Found ${heuristicUrl} in the PAT list and git remotes, using it as the instanceUrl`,
      );
      return heuristicUrl;
    }

    if (intersection.length > 1) {
      this.log(
        `Found more than one intersection of git remotes and configured PATs, ${intersection}`,
      );
    }

    return null;
  }

  async fetchCurrentInstanceUrl(): Promise<string> {
    // if the workspace setting exists, use it
    if (this.instanceUrl) {
      return this.instanceUrl;
    }

    // try to determine the instance URL heuristically
    const heuristicUrl = await this.heuristicInstanceUrl();
    if (heuristicUrl) {
      return heuristicUrl;
    }

    // default to Gitlab cloud
    return GITLAB_COM_URL;
  }
}
