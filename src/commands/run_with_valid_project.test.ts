import * as vscode from 'vscode';
import { runWithValidProjectOld } from './run_with_valid_project';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { asMock } from '../test_utils/as_mock';
import { createWrappedRepository } from '../test_utils/create_wrapped_repository';
import {
  getExtensionConfiguration,
  getRepositorySettings,
  RepositorySettings,
  setPreferredRemote,
} from '../utils/extension_configuration';
import { project } from '../test_utils/entities';
import { WrappedRepository } from '../git/wrapped_repository';

jest.mock('../utils/extension_configuration');
jest.mock('../log');

describe('runWithValidProject', () => {
  let repository: WrappedRepository;
  beforeEach(() => {
    asMock(getExtensionConfiguration).mockReturnValue({ instanceUrl: 'https://gitlab.com' });
    jest.spyOn(gitExtensionWrapper, 'repositories', 'get').mockImplementation(() => [repository]);
  });

  describe('with valid project', () => {
    beforeEach(() => {
      repository = createWrappedRepository({
        gitLabService: { getProject: async () => project },
      });
    });

    it('injects repository, remote, and GitLab project into the command', async () => {
      const command = jest.fn();

      await runWithValidProjectOld(command)();

      expect(command).toHaveBeenCalledWith(repository);
      expect(repository.remote?.projectPath).toEqual('extension');
      expect(await repository.getProject()).toEqual(project);
    });
  });

  describe('without project', () => {
    beforeEach(() => {
      repository = createWrappedRepository({
        gitLabService: { getProject: async () => undefined },
      });
    });

    it('throws an error', async () => {
      const command = jest.fn();

      await expect(runWithValidProjectOld(command)()).rejects.toThrowError(
        /Project \S+ was not found/,
      );

      expect(command).not.toHaveBeenCalledWith(repository);
    });
  });

  describe('with ambiguous remotes ', () => {
    let repoSettings: RepositorySettings;
    let command: jest.Mock;

    beforeEach(() => {
      repository = createWrappedRepository({
        gitLabService: { getProject: async () => project },
        remotes: [
          ['origin', 'git@a.com:gitlab/extension.git'],
          ['security', 'git@b.com:gitlab/extension.git'],
        ],
      });
      command = jest.fn();
      asMock(vscode.window.showQuickPick).mockImplementation(options => options[0]);
      asMock(setPreferredRemote).mockImplementation((root, rn) => {
        repoSettings = { preferredRemoteName: rn };
      });
      asMock(getRepositorySettings).mockImplementation(() => repoSettings);
    });

    it('lets user select which remote to use', async () => {
      await runWithValidProjectOld(command)();

      expect(command).toHaveBeenCalledWith(repository);
      expect(repository.remote?.host).toEqual('a.com');
    });

    it('lets user select which remote to use if the configured remote does not exist', async () => {
      repoSettings = { preferredRemoteName: 'invalid' };

      await runWithValidProjectOld(command)();

      expect(command).toHaveBeenCalledWith(repository);
      expect(repository.remote?.host).toEqual('a.com');
    });
  });
});
