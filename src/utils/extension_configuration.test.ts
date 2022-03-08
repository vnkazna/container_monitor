import * as vscode from 'vscode';
import { asMock } from '../test_utils/as_mock';
import { setPreferredRemote, getExtensionConfiguration } from './extension_configuration';

class FakeConfig {
  get(key: string) {
    return (this as any)[key];
  }

  update(key: string, value: any) {
    (this as any)[key] = value;
  }
}

describe('extension configuration', () => {
  let workspaceConfig: FakeConfig;
  const TEST_REPOSITORY_ROOT = '/repository/root';

  beforeEach(() => {
    workspaceConfig = new FakeConfig();
    asMock(vscode.workspace.getConfiguration).mockReturnValue(workspaceConfig);
  });

  describe('instanceUrl', () => {
    it('translates null to undefined', () => {
      workspaceConfig.update('instanceUrl', null);
      expect(getExtensionConfiguration().instanceUrl).toBeUndefined;
    });

    it('returns a valid URL', () => {
      workspaceConfig.update('instanceUrl', 'https://dev.gitlab.com');
      expect(getExtensionConfiguration().instanceUrl).toBe('https://dev.gitlab.com');
    });

    it('ignores invalid URL', () => {
      workspaceConfig.update('instanceUrl', 'htt://gitlab.com');
      expect(getExtensionConfiguration().instanceUrl).toBeUndefined;
    });
  });

  describe('setPreferredRemote', () => {
    it('stores preferred remote', async () => {
      await setPreferredRemote(TEST_REPOSITORY_ROOT, 'first');
      expect(workspaceConfig).toEqual({
        repositories: {
          [TEST_REPOSITORY_ROOT]: { preferredRemoteName: 'first' },
        },
      });
    });

    it('adds preferred remote', async () => {
      workspaceConfig.update('repositories', {
        [TEST_REPOSITORY_ROOT]: { preferredRemoteName: 'second' },
      });
      await setPreferredRemote('/root/path', 'first');
      expect(workspaceConfig).toEqual({
        repositories: {
          [TEST_REPOSITORY_ROOT]: { preferredRemoteName: 'second' },
          '/root/path': { preferredRemoteName: 'first' },
        },
      });
    });
  });
});
