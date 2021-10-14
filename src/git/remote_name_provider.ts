import { Remote } from '../api/git';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';

export const getRemoteName = (remotes: Remote[]): string => {
  const preferredRemote = getExtensionConfiguration().remoteName;
  const firstRemote = remotes[0];
  return preferredRemote || firstRemote?.name || 'origin';
};
