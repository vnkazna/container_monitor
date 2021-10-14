import { Remote } from '../api/git';
import { log } from '../log';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';

const getPreferredRemote = (repositoryRoot: string) => {
  const preferredRemote = getExtensionConfiguration().preferredRemotes[repositoryRoot];
  if (!preferredRemote) {
    log(`No preferred remote for ${repositoryRoot}.`);
  }
  return preferredRemote?.remoteName;
};

export const getRemoteName = (repositoryRoot: string, remotes: Remote[]): string | undefined => {
  if (remotes.length === 0) {
    return undefined;
  }
  if (remotes.length === 1) {
    return remotes[0].name;
  }
  const preferred = getPreferredRemote(repositoryRoot);
  return remotes.find(r => r.name === preferred)?.name;
};
