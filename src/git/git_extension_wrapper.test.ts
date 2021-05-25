import * as vscode from 'vscode';
import { GitExtensionWrapper } from './git_extension_wrapper';
import { GitLabRemoteSourceProviderRepository } from '../gitlab/clone/gitlab_remote_source_provider_repository';
import { gitlabCredentialsProvider } from '../gitlab/clone/gitlab_credentials_provider';
import { createFakeRepository, FakeGitExtension } from '../test_utils/fake_git_extension';
import { WrappedRepository } from './wrapped_repository';

jest.mock('../gitlab/clone/gitlab_credentials_provider');
jest.mock('../gitlab/clone/gitlab_remote_source_provider_repository');

describe('GitExtensionWrapper', () => {
  let fakeExtension: FakeGitExtension;
  let wrapper: GitExtensionWrapper;

  beforeEach(async () => {
    wrapper = new GitExtensionWrapper();
    fakeExtension = new FakeGitExtension();
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue({ exports: fakeExtension });
  });

  describe('initialization', () => {
    it('creates a new GitLabRemoteSourceProviderRepository', () => {
      wrapper.init();

      expect(GitLabRemoteSourceProviderRepository).toHaveBeenCalledWith(fakeExtension.gitApi);
    });

    it('adds credentials provider to the Git Extension', () => {
      wrapper.init();

      expect(fakeExtension.gitApi.credentialsProviders).toEqual([gitlabCredentialsProvider]);
    });
  });

  describe('repositories', () => {
    const fakeRepository = createFakeRepository({ rootUriPath: '/repository/root/path/' });
    const fakeRepository2 = createFakeRepository({ rootUriPath: '/repository/root/path2/' });
    const waitForRepositoryCountChanged = () =>
      new Promise<void>(resolve => {
        const sub = wrapper.onRepositoryCountChanged(() => {
          sub.dispose();
          resolve(undefined);
        });
      });

    it('returns no repositories when the extension is disabled', () => {
      fakeExtension.gitApi.repositories = [fakeRepository];
      fakeExtension.enabled = false;

      wrapper.init();

      expect(wrapper.repositories).toEqual([]);
    });

    it('returns wrapped repositories when the extension is enabled', async () => {
      fakeExtension.gitApi.repositories = [fakeRepository];

      wrapper.init();
      await waitForRepositoryCountChanged();

      expect(wrapper.repositories).toEqual([new WrappedRepository(fakeRepository)]);
    });

    describe('reacts to changes to repository count', () => {
      it.each`
        scenario                    | fireEvent
        ${'repository was opened'}  | ${() => fakeExtension.gitApi.onDidOpenRepositoryEmitter.fire(fakeRepository)}
        ${'repository was closed'}  | ${() => fakeExtension.gitApi.onDidCloseRepositoryEmitter.fire(fakeRepository)}
        ${'extension was disabled'} | ${() => fakeExtension.onDidChangeEnablementEmitter.fire(false)}
        ${'extension was enabled'}  | ${() => fakeExtension.onDidChangeEnablementEmitter.fire(true)}
      `('calls onRepositoryCountChanged listener when $scenario', async ({ fireEvent }) => {
        const onRepositoryCountChangedListener = jest.fn();
        wrapper.init();
        wrapper.onRepositoryCountChanged(onRepositoryCountChangedListener);

        fireEvent();
        await waitForRepositoryCountChanged();

        expect(onRepositoryCountChangedListener).toHaveBeenCalled();
      });
    });

    it('adds a new wrapped repository when repository is opened', async () => {
      fakeExtension.gitApi.repositories = [fakeRepository];
      wrapper.init();

      fakeExtension.gitApi.onDidOpenRepositoryEmitter.fire(fakeRepository2);
      await waitForRepositoryCountChanged();

      expect(wrapper.repositories.map(r => r.rootFsPath)).toEqual([
        fakeRepository.rootUri.fsPath,
        fakeRepository2.rootUri.fsPath,
      ]);
    });

    it('removes wrapped repository when repository is closed', async () => {
      fakeExtension.gitApi.repositories = [fakeRepository, fakeRepository2];
      wrapper.init();
      await waitForRepositoryCountChanged();

      fakeExtension.gitApi.onDidCloseRepositoryEmitter.fire(fakeRepository);

      expect(wrapper.repositories.map(r => r.rootFsPath)).toEqual([fakeRepository2.rootUri.fsPath]);
    });

    it('adds all repositories when the git extension gets enabled', async () => {
      fakeExtension.gitApi.repositories = [fakeRepository, fakeRepository2];
      fakeExtension.enabled = false;
      wrapper.init();

      fakeExtension.onDidChangeEnablementEmitter.fire(true);
      await waitForRepositoryCountChanged();

      expect(wrapper.repositories.map(r => r.rootFsPath)).toEqual([
        fakeRepository.rootUri.fsPath,
        fakeRepository2.rootUri.fsPath,
      ]);
    });

    it('returns repository wrapped repository for a repositoryRootPath', async () => {
      fakeExtension.gitApi.repositories = [fakeRepository, fakeRepository2];
      wrapper.init();
      await waitForRepositoryCountChanged();

      const repository = wrapper.getRepository('/repository/root/path/');

      expect(repository.rootFsPath).toBe('/repository/root/path/');
    });
  });
});
