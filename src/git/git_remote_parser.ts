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

export function parseGitRemote(instanceUrl: string, remote: string): GitRemote | null {
  // Regex to match gitlab potential starting names for ssh remotes.
  const normalizedRemote = remote.match(`^[a-zA-Z0-9_-]+@`) ? `ssh://${remote}` : remote;

  const { host, pathname } = url.parse(normalizedRemote);

  if (!host || !pathname) {
    return null;
  }

  const pathRegExp = escapeForRegExp(getInstancePath(instanceUrl));
  const match = pathname.match(`${pathRegExp}/:?(.+)/([^/]+?)(?:.git)?/?$`);
  if (!match) {
    return null;
  }

  const [namespace, project] = match.slice(1, 3);

  return { host, namespace, project };
}

module.exports = { parseGitRemote };
