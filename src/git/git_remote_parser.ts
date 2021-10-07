import * as url from 'url';

export interface GitRemote {
  host: string;
  namespace: string;
  project: string;
}

// returns path without the trailing slash or empty string if there is no path
const getInstancePath = (instanceUrl: string) => {
  const { pathname } = url.parse(instanceUrl);
  return pathname ? pathname.replace(/\/$/, '') : '';
};

const escapeForRegExp = (str: string) => {
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
};

function normalizeSshRemote(remote: string): string {
  // Regex to match git SSH remotes with custom port.
  // Example: [git@dev.company.com:7999]:group/repo_name.git
  // For more information see:
  // https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/309
  const sshRemoteWithCustomPort = remote.match(`^\\[([a-zA-Z0-9_-]+@.*?):\\d+\\](.*)$`);
  if (sshRemoteWithCustomPort) {
    return `ssh://${sshRemoteWithCustomPort[1]}${sshRemoteWithCustomPort[2]}`;
  }
  if (remote.match(`^[a-zA-Z0-9_-]+@`)) {
    // Regex to match gitlab potential starting names for ssh remotes.
    return `ssh://${remote}`;
  }
  return remote;
}

export function parseGitRemote(remote: string, instanceUrl?: string): GitRemote | undefined {
  const { host, pathname } = url.parse(normalizeSshRemote(remote));

  if (!host || !pathname) {
    return undefined;
  }
  // The instance url might have a custom route, i.e. www.company.com/gitlab. This route is
  // optional in the remote url. This regex extracts namespace and project from the remote
  // url while ignoring any custom route, if present. For more information see:
  // - https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/11
  // - https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/103
  const pathRegExp = instanceUrl ? escapeForRegExp(getInstancePath(instanceUrl)) : '';
  const match = pathname.match(`(?:${pathRegExp})?/:?(.+)/([^/]+?)(?:.git)?/?$`);
  if (!match) {
    return undefined;
  }

  const [namespace, project] = match.slice(1, 3);

  return { host, namespace, project };
}
