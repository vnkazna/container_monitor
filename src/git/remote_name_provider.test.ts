import { asMock } from '../test_utils/as_mock';
import {
  getExtensionConfiguration,
  Repositories,
  setExtensionConfiguration,
} from '../utils/get_extension_configuration';
import { getRemoteName, isAmbiguousRemote, setPreferredRemote } from './remote_name_provider';

jest.mock('../utils/get_extension_configuration');

describe('remote name provider', () => {
  const TEST_CONFIGURATION = {
    repositories: {},
  };
  const TEST_REPOSITORY_ROOT = '/repository/root';
  beforeEach(() => {
    asMock(getExtensionConfiguration).mockReturnValue(TEST_CONFIGURATION);
  });

  describe('getRemoteName', () => {
    it('returns the user-preferred remote name if user configured it', () => {
      asMock(getExtensionConfiguration).mockReturnValue({
        repositories: { [TEST_REPOSITORY_ROOT]: { preferredRemoteName: 'second' } },
      });
      const result = getRemoteName(TEST_REPOSITORY_ROOT, ['first', 'second']);
      expect(result).toBe('second');
    });

    it('returns name of the remote if there is only one remote', () => {
      const result = getRemoteName(TEST_REPOSITORY_ROOT, ['first']);
      expect(result).toBe('first');
    });

    it('returns undefined if there are no remotes', () => {
      const result = getRemoteName(TEST_REPOSITORY_ROOT, []);
      expect(result).toBe(undefined);
    });

    it('returns undefined if there are multiple remotes, but no preferred', () => {
      const result = getRemoteName(TEST_REPOSITORY_ROOT, ['first', 'second']);
      expect(result).toBe(undefined);
    });

    it('returns undefined if the preferred remote name does not exist', () => {
      asMock(getExtensionConfiguration).mockReturnValue({
        repositories: { [TEST_REPOSITORY_ROOT]: { preferredRemoteName: 'second' } },
      });
      const result = getRemoteName(TEST_REPOSITORY_ROOT, ['first', 'third']);
      expect(result).toBe(undefined);
    });
  });

  describe('isAmbiguousRemote', () => {
    it('returns true if there are multiple remotes and no preferred remote', () => {
      const result = isAmbiguousRemote(TEST_REPOSITORY_ROOT, ['first', 'second']);
      expect(result).toBe(true);
    });

    it('returns false if there are multiple remotes and a preferred remote', () => {
      asMock(getExtensionConfiguration).mockReturnValue({
        repositories: { [TEST_REPOSITORY_ROOT]: { preferredRemoteName: 'second' } },
      });
      const result = isAmbiguousRemote(TEST_REPOSITORY_ROOT, ['first', 'second']);
      expect(result).toBe(false);
    });

    it('returns false if there is only one remote', () => {
      const result = isAmbiguousRemote(TEST_REPOSITORY_ROOT, ['first']);
      expect(result).toBe(false);
    });
  });

  describe('setPreferredRemote', () => {
    it('stores preferred remote', async () => {
      await setPreferredRemote(TEST_REPOSITORY_ROOT, 'first');
      expect(setExtensionConfiguration).toHaveBeenCalledWith('repositories', {
        [TEST_REPOSITORY_ROOT]: { preferredRemoteName: 'first' },
      });
    });

    it('adds preferred remote', async () => {
      const existingRepositoriesConfig: Repositories = {
        [TEST_REPOSITORY_ROOT]: { preferredRemoteName: 'second' },
      };
      asMock(getExtensionConfiguration).mockReturnValue({
        repositories: existingRepositoriesConfig,
      });
      await setPreferredRemote('/root/path', 'first');
      expect(setExtensionConfiguration).toHaveBeenCalledWith('repositories', {
        ...existingRepositoriesConfig,
        '/root/path': { preferredRemoteName: 'first' },
      });
    });
  });
});
