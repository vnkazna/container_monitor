import { log } from '../log';
import {
  getExtensionConfiguration,
  Repositories,
  setExtensionConfiguration,
} from '../utils/extension_configuration';

const getPreferredRemote = (repositoryRoot: string) => {
  const preferredRemote = getExtensionConfiguration().repositories[repositoryRoot];
  return preferredRemote?.preferredRemoteName;
};

export const setPreferredRemote = async (repositoryRoot: string, remoteName: string) => {
  const { repositories: preferredRemotes } = getExtensionConfiguration();
  const updatedRemotes: Repositories = {
    ...preferredRemotes,
    [repositoryRoot]: { preferredRemoteName: remoteName },
  };
  await setExtensionConfiguration('repositories', updatedRemotes);
};

export const isAmbiguousRemote = (repositoryRoot: string, remoteNames: string[]) => {
  return remoteNames.length > 1 && !getPreferredRemote(repositoryRoot);
};

export const getRemoteName = (
  repositoryRoot: string,
  remoteNames: string[],
): string | undefined => {
  if (remoteNames.length === 0) {
    log(`Repository ${repositoryRoot} doesn't have any remotes.`);
    return undefined;
  }
  if (remoteNames.length === 1) {
    return remoteNames[0];
  }
  const preferred = getPreferredRemote(repositoryRoot);
  if (!preferred) {
    log(`No preferred remote for ${repositoryRoot}.`);
    return undefined;
  }
  if (!remoteNames.includes(preferred)) {
    log(`Saved preferred remote ${preferred} doesn't exist in repository ${repositoryRoot}`);
    return undefined;
  }

  return preferred;
};
