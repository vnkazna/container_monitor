import { Remote } from '../api/git';
import { asMock } from '../test_utils/as_mock';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';
import { getRemoteName } from './remote_name_provider';

jest.mock('../utils/get_extension_configuration');

describe('remote name provider', () => {
  describe('getRemoteName', () => {
    const TEST_CONFIGURATION = {
      preferredRemotes: {},
    };
    const TEST_REPOSITORY_ROOT = '/repository/root';
    const FIRST_REMOTE: Remote = {
      name: 'first',
      isReadOnly: false,
    };
    const SECOND_REMOTE: Remote = {
      name: 'second',
      isReadOnly: false,
    };

    beforeEach(() => {
      asMock(getExtensionConfiguration).mockReturnValue(TEST_CONFIGURATION);
    });

    it('returns the user-preferred remote name if user configured it', () => {
      asMock(getExtensionConfiguration).mockReturnValue({
        preferredRemotes: { [TEST_REPOSITORY_ROOT]: { remoteName: 'second' } },
      });
      const result = getRemoteName(TEST_REPOSITORY_ROOT, [FIRST_REMOTE, SECOND_REMOTE]);
      expect(result).toBe('second');
    });

    it('returns name of the remote if there is only one remote', () => {
      const result = getRemoteName(TEST_REPOSITORY_ROOT, [FIRST_REMOTE]);
      expect(result).toBe('first');
    });

    it('returns undefined if there are no remotes', () => {
      const result = getRemoteName(TEST_REPOSITORY_ROOT, []);
      expect(result).toBe(undefined);
    });

    it('returns undefined if there are multiple remotes, but no preferred', () => {
      const result = getRemoteName(TEST_REPOSITORY_ROOT, [FIRST_REMOTE, SECOND_REMOTE]);
      expect(result).toBe(undefined);
    });

    it('returns undefined if the preferred remote name does not exist', () => {
      asMock(getExtensionConfiguration).mockReturnValue({
        preferredRemotes: { [TEST_REPOSITORY_ROOT]: { remoteName: 'second' } },
      });
      const result = getRemoteName(TEST_REPOSITORY_ROOT, [
        FIRST_REMOTE,
        { name: 'third', isReadOnly: false },
      ]);
      expect(result).toBe(undefined);
    });
  });
});
