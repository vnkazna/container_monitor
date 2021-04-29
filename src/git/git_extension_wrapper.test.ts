import * as vscode from 'vscode';
import { GitExtensionWrapper } from './git_extension_wrapper';
import { GitLabRemoteSourceProviderRepository } from '../gitlab/clone/gitlab_remote_source_provider_repository';
import { gitlabCredentialsProvider } from '../gitlab/clone/gitlab_credentials_provider';
import { FakeGitExtension } from '../test_utils/fake_git_extension';

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
    // TODO: introduce full fake implementation of Repository
    const fakeRepository = 'repository1';

    it('returns no repositories when the extension is disabled', () => {
      fakeExtension.gitApi.repositories = [fakeRepository];
      fakeExtension.enabled = false;

      wrapper.init();

      expect(wrapper.repositories).toEqual([]);
    });

    it('returns repositories when the extension is enabled', () => {
      fakeExtension.gitApi.repositories = [fakeRepository];

      wrapper.init();

      expect(wrapper.repositories).toEqual([fakeRepository]);
    });

    describe('reacts to changes to repository count', () => {
      it.each`
        scenario                    | fireEvent
        ${'repository was opened'}  | ${() => fakeExtension.gitApi.onDidOpenRepositoryEmitter.fire()}
        ${'repository was closed'}  | ${() => fakeExtension.gitApi.onDidCloseRepositoryEmitter.fire()}
        ${'extension was disabled'} | ${() => fakeExtension.onDidChangeEnablementEmitter.fire(false)}
        ${'extension was enabled'}  | ${() => fakeExtension.onDidChangeEnablementEmitter.fire(true)}
      `('calls onRepositoryCountChanged listener when $scenario', ({ fireEvent }) => {
        const onRepositoryCountChangedListener = jest.fn();
        wrapper.init();
        wrapper.onRepositoryCountChanged(onRepositoryCountChangedListener);

        fireEvent();

        expect(onRepositoryCountChangedListener).toHaveBeenCalled();
      });
    });

    it('provides repositories after the git extension gets enabled', () => {
      fakeExtension.gitApi.repositories = [fakeRepository];
      fakeExtension.enabled = false;
      wrapper.init();

      fakeExtension.onDidChangeEnablementEmitter.fire(true);

      expect(wrapper.repositories).toEqual([fakeRepository]);
    });
  });
});
