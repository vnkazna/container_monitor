const url = require('url');

const getInstancePath = instanceUrl => {
  const { pathname } = url.parse(instanceUrl);
  if (pathname !== '/') {
    // Remove trailing slash if exists
    return pathname.replace(/\/$/, '');
  }

  // Do not return extra slash if no extra path in instance url
  return '';
};

const escapeForRegExp = str => {
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
};

function parseGitRemote(instanceUrl, remote) {
  // Regex to match gitlab potential starting names for ssh remotes.
  if (remote.match(`^[a-zA-Z0-9_-]+@`)) {
    // Temporarily disable eslint to be able to start enforcing stricter rules
    // eslint-disable-next-line no-param-reassign
    remote = `ssh://${remote}`;
  }

  const { protocol, host, pathname } = url.parse(remote);

  if (!host || !pathname) {
    return null;
  }

  const pathRegExp = escapeForRegExp(getInstancePath(instanceUrl));
  const match = pathname.match(`${pathRegExp}/:?(.+)/(.*?)(?:.git)?$`);
  if (!match) {
    return null;
  }

  return [protocol, host, ...match.slice(1, 3)];
}

module.exports = { parseGitRemote };
