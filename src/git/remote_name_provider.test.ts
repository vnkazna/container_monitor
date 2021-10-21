import { asMock } from '../test_utils/as_mock';
import { getRepositorySettings } from '../utils/extension_configuration';
import { getRemoteName } from './remote_name_provider';

jest.mock('../utils/extension_configuration');

describe('remote name provider', () => {
  const TEST_REPOSITORY_ROOT = '/repository/root';
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getRemoteName', () => {
    it('returns the user-preferred remote name if user configured it', () => {
      asMock(getRepositorySettings).mockReturnValue({
        preferredRemoteName: 'second',
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
      asMock(getRepositorySettings).mockReturnValue({
        preferredRemoteName: 'second',
      });
      const result = getRemoteName(TEST_REPOSITORY_ROOT, ['first', 'third']);
      expect(result).toBe(undefined);
    });
  });
});
