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
      let onRepositoryCountChangedListener: jest.Mock;

      beforeEach(() => {
        onRepositoryCountChangedListener = jest.fn();
        wrapper.init();
        wrapper.onRepositoryCountChanged(onRepositoryCountChangedListener);
      });
      it('calls onRepositoryCountChanged listeners when repository is opened', () => {
        fakeExtension.gitApi.onDidOpenRepositoryEmitter.fire();

        expect(onRepositoryCountChangedListener).toHaveBeenCalled();
      });

      it('calls onRepositoryCountChanged listeners when repository is closed', () => {
        fakeExtension.gitApi.onDidCloseRepositoryEmitter.fire();

        expect(onRepositoryCountChangedListener).toHaveBeenCalled();
      });

      it('calls onRepositoryCountChanged listeners when extension enablement changes', () => {
        fakeExtension.onDidChangeEnablementEmitter.fire(false);

        expect(onRepositoryCountChangedListener).toHaveBeenCalled();
      });
    });
  });
});
