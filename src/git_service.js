const execa = require('execa');
const url = require('url');
const { parseGitRemote } = require('./git/git_remote_parser');

async function fetch(cmd, workspaceFolder) {
  const [git, ...args] = cmd.trim().split(' ');
  let currentWorkspaceFolder = workspaceFolder;

  if (currentWorkspaceFolder == null) {
    currentWorkspaceFolder = '';
  }
  let output = null;
  try {
    output = await execa.stdout(git, args, {
      cwd: currentWorkspaceFolder,
      preferLocal: false,
    });
  } catch (ex) {
    // Fail siletly
  }

  return output;
}

const fetchGitRemoteUrls = async workspaceFolder => {
  const fetchGitRemotesVerbose = async () => {
    const cmd = 'git remote -v';
    const output = await fetch(cmd, workspaceFolder);

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
};

const intersectionOfInstanceAndTokenUrls = async (workspaceFolder, tokenService) => {
  const uriHostname = uri => url.parse(uri).host;

  const instanceUrls = tokenService.getInstanceUrls();
  const gitRemotes = await fetchGitRemoteUrls(workspaceFolder);
  const gitRemoteHosts = gitRemotes.map(remote => {
    const [, host] = parseGitRemote(null, remote);
    return host;
  });

  return instanceUrls.filter(host => gitRemoteHosts.includes(uriHostname(host)));
};

const heuristicInstanceUrl = async (workspaceFolder, tokenService) => {
  // if the intersection of git remotes and configured PATs exists and is exactly
  // one hostname, use it
  const intersection = await intersectionOfInstanceAndTokenUrls(workspaceFolder, tokenService);
  if (intersection.length === 1) {
    const heuristicUrl = intersection[0];
    console.log(
      `Found ${heuristicUrl} in the PAT list and git remotes, using it as the instanceUrl`,
    );
    return heuristicUrl;
  }

  if (intersection.length > 1) {
    console.log(
      'Found more than one intersection of git remotes and configured PATs',
      intersection,
    );
  }

  return null;
};

const fetchCurrentInstanceUrl = async (workspaceFolder, configuredInstanceUrl, tokenService) => {
  // if the workspace setting exists, use it
  if (configuredInstanceUrl) {
    return configuredInstanceUrl;
  }

  // try to determine the instance URL heuristically
  const heuristicUrl = await heuristicInstanceUrl(workspaceFolder, tokenService);
  if (heuristicUrl) {
    return heuristicUrl;
  }

  // default to Gitlab cloud
  return 'https://gitlab.com';
};

async function fetchBranchName(workspaceFolder) {
  const cmd = 'git rev-parse --abbrev-ref HEAD';
  const output = await fetch(cmd, workspaceFolder);

  return output;
}

/**
 * Fetches remote tracking branch name of current branch.
 * This should be used in link openers.
 *
 * Fixes #1 where local branch name is renamed and doesn't exists on remote but
 * local branch still tracks another branch on remote.
 */
async function fetchTrackingBranchName(workspaceFolder) {
  const branchName = await fetchBranchName(workspaceFolder);

  try {
    const cmd = `git config --get branch.${branchName}.merge`;
    const ref = await fetch(cmd, workspaceFolder);

    if (ref) {
      return ref.replace('refs/heads/', '');
    }
  } catch (e) {
    console.log(
      `Couldn't find tracking branch. Extension will fallback to branch name ${branchName}`,
    );
  }

  return branchName;
}

async function fetchLastCommitId(workspaceFolder) {
  const cmd = 'git log --format=%H -n 1';
  const output = await fetch(cmd, workspaceFolder);

  return output;
}

async function fetchRemoteUrl(remoteName, workspaceFolder, instanceUrl) {
  // If remote name isn't provided, the command returns default remote for the current branch
  const getUrlForRemoteName = async name =>
    fetch(`git ls-remote --get-url ${name || ''}`, workspaceFolder);

  const getFirstRemoteName = async () => {
    const multilineRemotes = await fetch('git remote', workspaceFolder);
    return (multilineRemotes || '').split('\n')[0];
  };

  let remoteUrl = await getUrlForRemoteName(remoteName);
  if (!remoteUrl) {
    // If there's no remote now, that means that there's no origin and no `remote.pushDefault` config.
    remoteUrl = await getUrlForRemoteName(await getFirstRemoteName());
  }

  if (remoteUrl) {
    const [schema, host, namespace, project] = parseGitRemote(instanceUrl, remoteUrl);

    return { schema, host, namespace, project };
  }

  return null;
}

class GitService {
  constructor(workspaceFolder, { instanceUrl, remoteName, pipelineGitRemoteName }, tokenService) {
    this.gitlabConfig = { instanceUrl, remoteName, pipelineGitRemoteName };
    this.workspaceFolder = workspaceFolder;
    this.tokenService = tokenService;
  }

  async fetchGitRemote() {
    const instanceUrl = await this.fetchCurrentInstanceUrl();
    return await fetchRemoteUrl(this.gitlabConfig.remoteName, this.workspaceFolder, instanceUrl);
  }

  async fetchBranchName() {
    return await fetchBranchName(this.workspaceFolder);
  }

  async fetchLastCommitId() {
    return await fetchLastCommitId(this.workspaceFolder);
  }

  async fetchGitRemotePipeline() {
    return await fetchRemoteUrl(
      this.gitlabConfig.pipelineGitRemoteName,
      this.workspaceFolder,
      this.gitlabConfig.instanceUrl,
    );
  }

  async fetchTrackingBranchName() {
    return await fetchTrackingBranchName(this.workspaceFolder);
  }

  async fetchCurrentInstanceUrl() {
    return await fetchCurrentInstanceUrl(
      this.workspaceFolder,
      this.gitlabConfig.instanceUrl,
      this.tokenService,
    );
  }
}

module.exports = GitService;
