import * as vscode from 'vscode';
import { DO_NOT_SHOW_VERSION_WARNING } from '../constants';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { getVersionForEachRepo } from './check_version';
import * as logMock from '../log';

describe('check_version', () => {
  describe('getVersionForEachRepo', () => {
    let state: Record<string, any>;
    let mockedRepositories: any[];
    const context = {
      workspaceState: {
        get(key: string) {
          return state[key];
        },
        update(key: string, value: any) {
          state[key] = value;
        },
      },
    };

    const createMockRepo = (version: string) => ({
      name: 'Test Repo',
      getVersion: getVersion.mockResolvedValue(version),
    });

    beforeEach(() => {
      state = {
        [DO_NOT_SHOW_VERSION_WARNING]: false,
      };
      jest.resetAllMocks();
      jest
        .spyOn(gitExtensionWrapper, 'repositories', 'get')
        .mockImplementation(() => mockedRepositories);

      jest.spyOn(logMock, 'log');
    });
    const getVersion = jest.fn();

    it('does nothing when there are no repos', async () => {
      mockedRepositories = [];
      await getVersionForEachRepo(gitExtensionWrapper, context as vscode.ExtensionContext);
      expect(getVersion).not.toHaveBeenCalled();
    });

    it.each`
      version
      ${'13.5.0'}
      ${'13.6.3'}
      ${'13.6.0-pre'}
      ${'13.12.4'}
      ${'abc13.5def'}
    `('gets $version successfully', async ({ version }) => {
      mockedRepositories = [createMockRepo(`${version}`)];

      await getVersionForEachRepo(gitExtensionWrapper, context as vscode.ExtensionContext);
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    xit(`shows warning when version is below 13.5`, async () => {
      mockedRepositories = [createMockRepo(`13.4.2`)];

      await getVersionForEachRepo(gitExtensionWrapper, context as vscode.ExtensionContext);
      expect(vscode.window.showErrorMessage).toHaveBeenCalled();
    });

    it('logs match warning if there is no regex match', async () => {
      const BAD_VERSION = 'abcdefg';
      mockedRepositories = [createMockRepo(BAD_VERSION)];

      await getVersionForEachRepo(gitExtensionWrapper, context as vscode.ExtensionContext);
      expect(logMock.log).toHaveBeenCalledWith(`Could not match version from "${BAD_VERSION}"`);
    });

    xit('stores user preference for not showing the warning', async () => {
      mockedRepositories = [createMockRepo('13.4')];
      (vscode.window.showErrorMessage as jest.Mock).mockResolvedValue('Do not show again');

      await getVersionForEachRepo(gitExtensionWrapper, context as vscode.ExtensionContext);

      expect(state[DO_NOT_SHOW_VERSION_WARNING]).toBe(true);
    });

    it('does not show warning if user said they do not want to see it', async () => {
      mockedRepositories = [createMockRepo('13.4')];
      state = {
        [DO_NOT_SHOW_VERSION_WARNING]: true,
      };

      await getVersionForEachRepo(gitExtensionWrapper, context as vscode.ExtensionContext);

      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });
  });
});
