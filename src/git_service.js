const vscode = require('vscode');
const execa = require('execa');
const url = require('url');

const currentInstanceUrl = () => vscode.workspace.getConfiguration('gitlab').instanceUrl;

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

const getInstancePath = () => {
  const pathname = url.parse(currentInstanceUrl()).pathname;
  if (pathname !== '/') {
    // Remove trailing slash if exists
    return pathname.replace(/\/$/, '');
  }

  // Do not return extra slash if no extra path in instance url
  return '';
};

const escapeForRegExp = str => {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

const parseGitRemote = remote => {
  // Regex to match gitlab potential starting names for ssh remotes.
  if (remote.match(`^[a-zA-Z0-9_-]+@`)) {
    remote = 'ssh://' + remote;
  }

  const { protocol, host, pathname } = url.parse(remote);

  if (!host || !pathname) {
    return null;
  }

  const pathRegExp = escapeForRegExp(getInstancePath());
  const match = pathname.match(pathRegExp + '/:?(.+)/(.*?)(?:.git)?$');
  if (!match) {
    return null;
  }

  return [protocol, host, ...match.slice(1, 3)];
};

async function fetchRemoteUrl(remoteName, workspaceFolder) {
  // If remote name isn't provided, we the command returns default remote for the current branch
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
    const [schema, host, namespace, project] = parseGitRemote(remoteUrl);

    return { schema, host, namespace, project };
  }

  return null;
}

async function fetchGitRemote(workspaceFolder) {
  const { remoteName } = vscode.workspace.getConfiguration('gitlab');

  return await fetchRemoteUrl(remoteName, workspaceFolder);
}

async function fetchGitRemotePipeline(workspaceFolder) {
  const { pipelineGitRemoteName } = vscode.workspace.getConfiguration('gitlab');

  return await fetchRemoteUrl(pipelineGitRemoteName, workspaceFolder);
}

exports.fetchBranchName = fetchBranchName;
exports.fetchTrackingBranchName = fetchTrackingBranchName;
exports.fetchLastCommitId = fetchLastCommitId;
exports.fetchGitRemote = fetchGitRemote;
exports.fetchGitRemotePipeline = fetchGitRemotePipeline;
