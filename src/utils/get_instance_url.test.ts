import * as temp from 'temp';
import * as vscode from 'vscode';
import simpleGit, { SimpleGit } from 'simple-git';
import { getInstanceUrl } from './get_instance_url';
import { tokenService } from '../services/token_service';
import { GITLAB_COM_URL } from '../constants';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';

describe('get_instance_url', () => {
  const ORIGIN = 'origin';
  const SECOND_REMOTE = 'second'; // name is important, we need this remote to be alphabetically behind origin

  let workspaceFolder: string;
  let git: SimpleGit;

  temp.track(); // clean temporary folders after the tests finish

  const createTempFolder = (): Promise<string> =>
    new Promise((resolve, reject) => {
      temp.mkdir('vscodeWorkplace', (err, dirPath) => {
        if (err) reject(err);
        resolve(dirPath);
      });
    });

  beforeEach(() => {
    jest.spyOn(gitExtensionWrapper, 'gitBinaryPath', 'get').mockReturnValue('git');
  });

  it('returns configured instanceUrl if the config contains one', async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      instanceUrl: 'https://test.com',
    });
    expect(await getInstanceUrl()).toBe('https://test.com');
  });

  it('returns default instanceUrl when there is no configuration', async () => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({});
    expect(await getInstanceUrl()).toBe(GITLAB_COM_URL);
  });

  describe('heuristic', () => {
    let tokens = {};
    const fakeContext = {
      globalState: {
        get: () => tokens,
      },
    };
    beforeEach(async () => {
      workspaceFolder = await createTempFolder();
      git = simpleGit(workspaceFolder, { binary: 'git' });
      await git.init();
      await git.addRemote(ORIGIN, 'https://git@gitlab.com/gitlab-org/gitlab-vscode-extension.git');
      tokens = {};
      tokenService.init((fakeContext as any) as vscode.ExtensionContext);
    });

    it('returns instanceUrl when there is exactly one match between remotes and token URLs', async () => {
      await git.addRemote(SECOND_REMOTE, 'https://git@test-instance.com/g/extension.git');
      tokens = {
        'https://test-instance.com': 'abc',
      };
      expect(await getInstanceUrl(workspaceFolder)).toBe('https://test-instance.com');
    });

    it('returns default instanceUrl when there is multiple matches between remotes and token URLs', async () => {
      await git.addRemote(SECOND_REMOTE, 'https://git@test-instance.com/g/extension.git');
      tokens = {
        'https://test-instance.com': 'abc',
        'https://gitlab.com': 'def',
      };
      expect(await getInstanceUrl(workspaceFolder)).toBe(GITLAB_COM_URL);
    });

    it('it works with URLs in git format', async () => {
      await git.addRemote(SECOND_REMOTE, 'git@test-instance.com:g/extension.git');
      tokens = {
        'https://test-instance.com': 'abc',
      };
      expect(await getInstanceUrl(workspaceFolder)).toBe('https://test-instance.com');
    });
  });
});
