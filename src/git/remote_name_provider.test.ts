import { Remote } from '../api/git';
import { asMock } from '../test_utils/as_mock';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';
import { getRemoteName } from './remote_name_provider';

jest.mock('../utils/get_extension_configuration');

describe('remote name provider', () => {
  describe('getRemoteName', () => {
    const TEST_REMOTES: Remote[] = [
      {
        name: 'first',
        isReadOnly: false,
      },
      {
        name: 'second',
        isReadOnly: false,
      },
    ];

    beforeEach(() => {
      asMock(getExtensionConfiguration).mockReturnValue({});
    });

    it('returns the user-preferred remote name if user configured it', () => {
      asMock(getExtensionConfiguration).mockReturnValue({ remoteName: 'configured-name' });
      const result = getRemoteName(TEST_REMOTES);
      expect(result).toBe('configured-name');
    });

    it('returns the first remote name if there is no configuration', () => {
      const result = getRemoteName(TEST_REMOTES);
      expect(result).toBe('first');
    });

    it('returns "origin" if there are no remotes', () => {
      const result = getRemoteName([]);
      expect(result).toBe('origin');
    });
  });
});
