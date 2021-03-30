import * as vscode from 'vscode';
import { GitExtensionWrapper } from './git_extension_wrapper';
import { GitLabRemoteSourceProviderRepository } from '../gitlab/clone/gitlab_remote_source_provider_repository';
import { gitlabCredentialsProvider } from '../gitlab/clone/gitlab_credentials_provider';
import { FakeGitExtension } from '../test_utils/fake_git_extension';

jest.mock('../gitlab/clone/gitlab_credentials_provider');
jest.mock('../gitlab/clone/gitlab_remote_source_provider_repository');

describe('GitExtensionWrapper', () => {
  let fakeExtension: FakeGitExtension;

  beforeEach(async () => {
    fakeExtension = new FakeGitExtension();
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue({ exports: fakeExtension });
  });

  it('creates a new GitLabRemoteSourceProviderRepository', async () => {
    new GitExtensionWrapper().init();

    expect(GitLabRemoteSourceProviderRepository).toHaveBeenCalledWith(fakeExtension.gitApi);
  });

  it('adds credentials provider to the Git Extension', async () => {
    new GitExtensionWrapper().init();

    expect(fakeExtension.gitApi.credentialsProviders).toEqual([gitlabCredentialsProvider]);
  });
});
