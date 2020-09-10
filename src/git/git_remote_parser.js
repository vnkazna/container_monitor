const url = require('url');

// returns path without the trailing slash or empty string if there is no path
const getInstancePath = instanceUrl => {
  const { pathname } = url.parse(instanceUrl);
  return pathname.replace(/\/$/, '');
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

  if (!instanceUrl) {
    return [protocol, host, pathname];
  }

  const pathRegExp = escapeForRegExp(getInstancePath(instanceUrl));
  const match = pathname.match(`${pathRegExp}/:?(.+)/(.*?)(?:.git)?$`);
  if (!match) {
    return null;
  }

  return [protocol, host, ...match.slice(1, 3)];
}

module.exports = { parseGitRemote };
