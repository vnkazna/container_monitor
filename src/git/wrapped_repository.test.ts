import * as vscode from 'vscode';
import { WrappedRepository } from './wrapped_repository';
import {
  getExtensionConfiguration,
  getRepositorySettings,
  Repositories,
} from '../utils/extension_configuration';
import { tokenService } from '../services/token_service';
import { GITLAB_COM_URL } from '../constants';
import { gqlProject, project } from '../test_utils/entities';
import { createWrappedRepository } from '../test_utils/create_wrapped_repository';
import { asMock } from '../test_utils/as_mock';
import { GitLabProject } from '../gitlab/gitlab_project';

jest.mock('../utils/extension_configuration');

describe('WrappedRepository', () => {
  let wrappedRepository: WrappedRepository;
  let repositories: Repositories;

  beforeEach(() => {
    jest.resetAllMocks();
    wrappedRepository = createWrappedRepository();
    repositories = {
      [wrappedRepository.rootFsPath]: { preferredRemoteName: 'first' },
    };
    (getExtensionConfiguration as jest.Mock).mockReturnValue({
      repositories,
    });
  });

  describe('instanceUrl', () => {
    let tokens = {};
    const fakeContext = {
      globalState: {
        get: () => tokens,
      },
    };

    beforeEach(() => {
      tokens = {};
      tokenService.init(fakeContext as any as vscode.ExtensionContext);
    });
    it('should return configured instanceUrl', async () => {
      (getExtensionConfiguration as jest.Mock).mockReturnValue({
        instanceUrl: 'https://test.com',
      });

      expect(wrappedRepository.instanceUrl).toBe('https://test.com');
    });

    it('returns default instanceUrl when there is no configuration', async () => {
      (getExtensionConfiguration as jest.Mock).mockReturnValue({});
      expect(wrappedRepository.instanceUrl).toBe(GITLAB_COM_URL);
    });

    describe('heuristic', () => {
      it('returns instanceUrl when there is exactly one match between remotes and token URLs', async () => {
        tokens = {
          'https://test-instance.com': 'abc',
        };

        wrappedRepository = createWrappedRepository({
          remotes: [
            ['a', 'https://git@gitlab.com/gitlab-org/gitlab-vscode-extension.git'],
            ['b', 'https://git@test-instance.com/g/extension.git'],
          ],
        });

        expect(wrappedRepository.instanceUrl).toBe('https://test-instance.com');
      });

      it('returns default instanceUrl when there is multiple matches between remotes and token URLs', async () => {
        tokens = {
          'https://test-instance.com': 'abc',
          'https://gitlab.com': 'def',
        };

        wrappedRepository = createWrappedRepository({
          remotes: [
            ['a', 'https://git@gitlab.com/gitlab-org/gitlab-vscode-extension.git'],
            ['b', 'https://git@test-instance.com/g/extension.git'],
          ],
        });

        expect(wrappedRepository.instanceUrl).toBe(GITLAB_COM_URL);
      });
    });
  });

  describe('remote', () => {
    const firstRemote: [string, string] = ['first', 'git@test.gitlab.com:gitlab-org/first.git'];
    const secondRemote: [string, string] = ['second', 'git@test.gitlab.com:gitlab-org/second.git'];

    it.each`
      scenario                            | preferredRemoteName | remotes                        | expectedRemoteProject
      ${'single remote'}                  | ${undefined}        | ${[firstRemote]}               | ${'first'}
      ${'user preferred remote'}          | ${'second'}         | ${[firstRemote, secondRemote]} | ${'second'}
      ${'no remotes'}                     | ${undefined}        | ${[]}                          | ${undefined}
      ${'multiple remotes, no preferred'} | ${undefined}        | ${[firstRemote, secondRemote]} | ${undefined}
      ${'wrong preferred remote'}         | ${'third'}          | ${[firstRemote, secondRemote]} | ${undefined}
    `(
      'behaves correctly with $scenario',
      ({ preferredRemoteName, remotes, expectedRemoteProject }) => {
        asMock(getRepositorySettings).mockReturnValue({
          preferredRemoteName,
        });
        wrappedRepository = createWrappedRepository({
          remotes,
        });

        const result = wrappedRepository.remote;

        expect(result?.projectPath).toBe(expectedRemoteProject);
      },
    );
  });

  describe('name', () => {
    it('uses folder name when there is no cached GitLab project', () => {
      wrappedRepository = createWrappedRepository({ rootUriPath: '/path/to/gitlab-project' });

      expect(wrappedRepository.name).toEqual('gitlab-project');
    });

    it('uses GitLab project name if the project is cached', async () => {
      wrappedRepository = createWrappedRepository({
        gitLabService: {
          getProject: () => Promise.resolve(project),
        },
        remotes: [['first', 'git@test.gitlab.com:gitlab-org/gitlab.git']],
      });

      await wrappedRepository.getProject();

      expect(wrappedRepository.name).toEqual(project.name);
    });
  });

  describe('pipeline project', () => {
    const firstRemote: [string, string] = ['first', 'git@test.gitlab.com:gitlab-org/first.git'];
    const secondRemote: [string, string] = ['second', 'git@test.gitlab.com:gitlab-org/second.git'];

    beforeEach(() => {
      wrappedRepository = createWrappedRepository({
        gitLabService: {
          getProject: (fullPath: string) =>
            Promise.resolve(new GitLabProject({ ...gqlProject, fullPath })),
        },
        remotes: [firstRemote, secondRemote],
      });
    });

    it('should use the pipeline configuration', async () => {
      asMock(getExtensionConfiguration).mockReturnValue({
        repositories,
        pipelineGitRemoteName: 'second',
      });
      const result = await wrappedRepository.getPipelineProject();
      expect(result?.namespaceWithPath).toBe('gitlab-org/second');
    });

    it('falls back to normal project if the pipeline remote is not configured', async () => {
      asMock(getExtensionConfiguration).mockReturnValue({
        repositories,
      });
      asMock(getRepositorySettings).mockReturnValue({
        preferredRemoteName: 'first',
      });
      const result = await wrappedRepository.getPipelineProject();
      expect(result?.namespaceWithPath).toBe('gitlab-org/first');
    });
  });
});
