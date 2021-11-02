import * as vscode from 'vscode';
import { runWithValidProject } from './run_with_valid_project';
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
import { log } from '../log';

jest.mock('../git/git_extension_wrapper');
jest.mock('../utils/extension_configuration');
jest.mock('../log');

describe('runWithValidProject', () => {
  let repository: WrappedRepository;
  beforeEach(() => {
    asMock(getExtensionConfiguration).mockReturnValue({ instanceUrl: 'https://gitlab.com' });
    asMock(log).mockImplementation(m => console.log(m));
  });

  describe('with valid project', () => {
    beforeEach(() => {
      repository = createWrappedRepository({
        gitLabService: { getProject: async () => project },
      });
      asMock(gitExtensionWrapper.getActiveRepositoryOrSelectOne).mockResolvedValue(repository);
    });

    it('injects repository, remote, and GitLab project into the command', async () => {
      const command = jest.fn();

      await runWithValidProject(command)();

      expect(command).toHaveBeenCalledWith(repository);
      expect(repository.remote?.project).toEqual('extension');
      expect(await repository.getProject()).toEqual(project);
    });
  });

  describe('without project', () => {
    beforeEach(() => {
      repository = createWrappedRepository({
        gitLabService: { getProject: async () => undefined },
      });
      asMock(gitExtensionWrapper.getActiveRepositoryOrSelectOne).mockResolvedValue(repository);
    });

    it('throws an error', async () => {
      const command = jest.fn();

      await expect(runWithValidProject(command)()).rejects.toThrowError(
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
      asMock(gitExtensionWrapper.getActiveRepositoryOrSelectOne).mockResolvedValue(repository);
      command = jest.fn();
      asMock(vscode.window.showQuickPick).mockImplementation(options => options[0]);
      asMock(setPreferredRemote).mockImplementation((root, rn) => {
        repoSettings = { preferredRemoteName: rn };
      });
      asMock(getRepositorySettings).mockImplementation(() => repoSettings);
    });

    it('lets user select which remote to use', async () => {
      await runWithValidProject(command)();

      expect(command).toHaveBeenCalledWith(repository);
      expect(repository.remote?.host).toEqual('a.com');
    });

    it('lets user select which remote to use if the configured remote does not exist', async () => {
      repoSettings = { preferredRemoteName: 'invalid' };

      await runWithValidProject(command)();

      expect(command).toHaveBeenCalledWith(repository);
      expect(repository.remote?.host).toEqual('a.com');
    });
  });
});
