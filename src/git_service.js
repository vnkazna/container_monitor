const execa = require('execa');
const url = require('url');
const { GITLAB_COM_URL } = require('./constants');
const { parseGitRemote } = require('./git/git_remote_parser');

class GitService {
  constructor(
    workspaceFolder,
    instanceUrl,
    remoteName,
    pipelineGitRemoteName,
    tokenService,
    log = () => {},
  ) {
    this.instanceUrl = instanceUrl;
    this.remoteName = remoteName;
    this.pipelineGitRemoteName = pipelineGitRemoteName;
    this.workspaceFolder = workspaceFolder;
    this.tokenService = tokenService;
    this.log = log;
  }

  async _fetch(cmd) {
    const [git, ...args] = cmd.trim().split(' ');
    let currentWorkspaceFolder = this.workspaceFolder;

    if (currentWorkspaceFolder == null) {
      currentWorkspaceFolder = '';
    }
    let output = null;
    try {
      output = await execa.stdout(git, args, {
        cwd: currentWorkspaceFolder,
        preferLocal: false,
      });
    } catch (e) {
      this.log(`${e.message}\n${e.stack}`);
    }

    return output;
  }

  async _fetchRemoteUrl(remoteName) {
    // If remote name isn't provided, the command returns default remote for the current branch
    const getUrlForRemoteName = async name => this._fetch(`git ls-remote --get-url ${name || ''}`);

    const getFirstRemoteName = async () => {
      const multilineRemotes = await this._fetch('git remote');
      return (multilineRemotes || '').split('\n')[0];
    };

    let remoteUrl = await getUrlForRemoteName(remoteName);
    if (!remoteUrl) {
      // If there's no remote now, that means that there's no origin and no `remote.pushDefault` config.
      remoteUrl = await getUrlForRemoteName(await getFirstRemoteName());
    }

    if (remoteUrl) {
      const [schema, host, namespace, project] = parseGitRemote(
        await this.fetchCurrentInstanceUrl(),
        remoteUrl,
      );

      return { schema, host, namespace, project };
    }

    return null;
  }

  async fetchGitRemote() {
    return await this._fetchRemoteUrl(this.remoteName);
  }

  async fetchBranchName() {
    return await this._fetch('git rev-parse --abbrev-ref HEAD');
  }

  async fetchLastCommitId() {
    return await this._fetch('git log --format=%H -n 1');
  }

  async fetchGitRemotePipeline() {
    return await this._fetchRemoteUrl(this.pipelineGitRemoteName);
  }

  /**
   * Fetches remote tracking branch name of current branch.
   * This should be used in link openers.
   *
   * Fixes #1 where local branch name is renamed and doesn't exists on remote but
   * local branch still tracks another branch on remote.
   */
  async fetchTrackingBranchName() {
    const branchName = await this.fetchBranchName();

    try {
      const ref = await this._fetch(`git config --get branch.${branchName}.merge`);

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

  async _fetchGitRemoteUrls() {
    const fetchGitRemotesVerbose = async () => {
      const output = await this._fetch('git remote -v');

      return (output || '').split('\n');
    };

    const parseRemoteFromVerboseLine = line => {
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

  async _intersectionOfInstanceAndTokenUrls() {
    const uriHostname = uri => url.parse(uri).host;

    const instanceUrls = this.tokenService.getInstanceUrls();
    const gitRemotes = await this._fetchGitRemoteUrls();
    const gitRemoteHosts = gitRemotes.map(remote => {
      const [, host] = parseGitRemote(null, remote);
      return host;
    });

    return instanceUrls.filter(host => gitRemoteHosts.includes(uriHostname(host)));
  }

  async _heuristicInstanceUrl() {
    // if the intersection of git remotes and configured PATs exists and is exactly
    // one hostname, use it
    const intersection = await this._intersectionOfInstanceAndTokenUrls();
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

  async fetchCurrentInstanceUrl() {
    // if the workspace setting exists, use it
    if (this.instanceUrl) {
      return this.instanceUrl;
    }

    // try to determine the instance URL heuristically
    const heuristicUrl = await this._heuristicInstanceUrl();
    if (heuristicUrl) {
      return heuristicUrl;
    }

    // default to Gitlab cloud
    return GITLAB_COM_URL;
  }
}

module.exports = GitService;
