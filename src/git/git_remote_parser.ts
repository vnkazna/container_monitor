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

export function parseGitRemote(remote: string, instanceUrl?: string): GitRemote | undefined {
  // Regex to match gitlab potential starting names for ssh remotes.
  const normalizedRemote = remote.match(`^[a-zA-Z0-9_-]+@`) ? `ssh://${remote}` : remote;

  const { host, pathname } = url.parse(normalizedRemote);

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

module.exports = { parseGitRemote };
