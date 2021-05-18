import * as vscode from 'vscode';
import { WrappedRepository } from './wrapped_repository';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';
import { tokenService } from '../services/token_service';
import { createFakeRepository } from '../test_utils/fake_git_extension';
import { Repository } from '../api/git';
import { GITLAB_COM_URL } from '../constants';

jest.mock('../utils/get_extension_configuration');

describe('WrappedRepository', () => {
  let repository: Repository;
  let wrappedRepository: WrappedRepository;

  beforeEach(() => {
    jest.resetAllMocks();
    (getExtensionConfiguration as jest.Mock).mockReturnValue({});
    repository = createFakeRepository();
    wrappedRepository = new WrappedRepository(repository);
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
        repository = createFakeRepository({
          remotes: [
            ['a', 'https://git@gitlab.com/gitlab-org/gitlab-vscode-extension.git'],
            ['b', 'https://git@test-instance.com/g/extension.git'],
          ],
        });
        tokens = {
          'https://test-instance.com': 'abc',
        };

        wrappedRepository = new WrappedRepository(repository);

        expect(wrappedRepository.instanceUrl).toBe('https://test-instance.com');
      });

      it('returns default instanceUrl when there is multiple matches between remotes and token URLs', async () => {
        repository = createFakeRepository({
          remotes: [
            ['a', 'https://git@gitlab.com/gitlab-org/gitlab-vscode-extension.git'],
            ['b', 'https://git@test-instance.com/g/extension.git'],
          ],
        });
        tokens = {
          'https://test-instance.com': 'abc',
          'https://gitlab.com': 'def',
        };

        wrappedRepository = new WrappedRepository(repository);

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
      repository = createFakeRepository({
        remotes: defaultRemotes,
      });

      wrappedRepository = new WrappedRepository(repository);

      expect(wrappedRepository.remote).toEqual({
        host: 'test.gitlab.com',
        namespace: 'gitlab-org',
        project: 'gitlab',
      });
    });

    it('gets the remote url for user configured remote name', () => {
      (getExtensionConfiguration as jest.Mock).mockReturnValue({
        remoteName: 'second',
      });
      repository = createFakeRepository({
        remotes: defaultRemotes,
      });

      wrappedRepository = new WrappedRepository(repository);

      expect(wrappedRepository.remote).toEqual({
        host: 'test-instance.com',
        namespace: 'g',
        project: 'extension',
      });
    });

    it('gets default remote for a branch', () => {
      repository = createFakeRepository({
        remotes: defaultRemotes,
        headRemoteName: 'second', // the current branch is tracking a branch from 'second' remote
      });

      wrappedRepository = new WrappedRepository(repository);

      expect(wrappedRepository.remote).toEqual({
        host: 'test-instance.com',
        namespace: 'g',
        project: 'extension',
      });
    });

    it('returns error when there are no remotes', () => {
      repository = createFakeRepository({
        remotes: [],
      });

      wrappedRepository = new WrappedRepository(repository);

      expect(() => wrappedRepository.remote).toThrowError();
    });
  });
});
