import { log } from '../log';
import { getRepositorySettings } from '../utils/extension_configuration';

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
  const preferred = getRepositorySettings(repositoryRoot)?.preferredRemoteName;
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
