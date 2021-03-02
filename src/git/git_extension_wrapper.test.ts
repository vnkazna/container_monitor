import { GitExtension } from '../api/git';
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
  });

  it('creates a new GitLabRemoteSourceProviderRepository', async () => {
    // TODO: maybe introduce something like an initialize method instead of doing the work in constructor
    // eslint-disable-next-line no-new
    new GitExtensionWrapper((fakeExtension as unknown) as GitExtension);

    expect(GitLabRemoteSourceProviderRepository).toHaveBeenCalledWith(fakeExtension.gitApi);
  });

  it('adds credentials provider to the Git Extension', async () => {
    // TODO: maybe introduce something like an initialize method instead of doing the work in constructor
    // eslint-disable-next-line no-new
    new GitExtensionWrapper((fakeExtension as unknown) as GitExtension);

    expect(fakeExtension.gitApi.credentialsProviders).toEqual([gitlabCredentialsProvider]);
  });
});
