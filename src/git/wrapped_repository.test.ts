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
            'https://git@gitlab.com/gitlab-org/gitlab-vscode-extension.git',
            'https://git@test-instance.com/g/extension.git',
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
            'https://git@gitlab.com/gitlab-org/gitlab-vscode-extension.git',
            'https://git@test-instance.com/g/extension.git',
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
});
