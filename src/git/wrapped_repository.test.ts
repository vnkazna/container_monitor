import * as vscode from 'vscode';
import { WrappedRepository } from './wrapped_repository';
import { getExtensionConfiguration, Repositories } from '../utils/extension_configuration';
import { tokenService } from '../services/token_service';
import { GITLAB_COM_URL } from '../constants';
import { mr, mrVersion, project } from '../test_utils/entities';
import { createWrappedRepository } from '../test_utils/create_wrapped_repository';

jest.mock('../utils/extension_configuration');

describe('WrappedRepository', () => {
  let wrappedRepository: WrappedRepository;

  beforeEach(() => {
    jest.resetAllMocks();
    wrappedRepository = createWrappedRepository();
    const repositories: Repositories = {
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
      tokenService.init((fakeContext as any) as vscode.ExtensionContext);
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
    const defaultRemotes: [string, string][] = [
      ['first', 'git@test.gitlab.com:gitlab-org/gitlab.git'],
      ['second', 'https://git@test-instance.com/g/extension.git'],
    ];

    it('gets the remote url for first origin', () => {
      wrappedRepository = createWrappedRepository({
        remotes: defaultRemotes,
      });

      expect(wrappedRepository.remote).toEqual({
        host: 'test.gitlab.com',
        namespace: 'gitlab-org',
        project: 'gitlab',
      });
    });

    it('returns undefined when there are no remotes', () => {
      wrappedRepository = createWrappedRepository({
        remotes: [],
      });

      expect(wrappedRepository.remote).toBeUndefined();
    });
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

  describe('cached MRs', () => {
    it('returns undefined if the MR is not cached', () => {
      wrappedRepository = createWrappedRepository();

      expect(wrappedRepository.getMr(1)).toBe(undefined);
    });

    it('fetches MR versions when we reload MR', async () => {
      wrappedRepository = createWrappedRepository({
        gitLabService: {
          getMrDiff: async () => mrVersion,
        },
      });

      const result = await wrappedRepository.reloadMr(mr);

      expect(result).toEqual({ mr, mrVersion });
    });

    it('returns MR when it was cached', async () => {
      wrappedRepository = createWrappedRepository({
        gitLabService: {
          getMrDiff: async () => mrVersion,
        },
      });

      await wrappedRepository.reloadMr(mr);

      expect(wrappedRepository.getMr(mr.id)).toEqual({ mr, mrVersion });
    });
  });
});
