import { log } from '../log';
import {
  getExtensionConfiguration,
  PreferredRemotes,
  setExtensionConfiguration,
} from '../utils/get_extension_configuration';

const getPreferredRemote = (repositoryRoot: string) => {
  const preferredRemote = getExtensionConfiguration().preferredRemotes[repositoryRoot];
  return preferredRemote?.remoteName;
};

export const setPreferredRemote = async (repositoryRoot: string, remoteName: string) => {
  const { preferredRemotes } = getExtensionConfiguration();
  const updatedRemotes: PreferredRemotes = {
    ...preferredRemotes,
    [repositoryRoot]: { remoteName },
  };
  await setExtensionConfiguration('preferredRemotes', updatedRemotes);
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
