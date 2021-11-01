import { tokenService } from '../../services/token_service';
import { API } from '../../api/git';
import { GitLabRemoteSourceProviderRepository } from './gitlab_remote_source_provider_repository';
import { FakeGitExtension } from '../../test_utils/fake_git_extension';

jest.mock('../../services/token_service');

describe('GitLabRemoteSourceProviderRepository', () => {
  let fakeExtension: FakeGitExtension;
  let tokenChangeListener: () => unknown;

  beforeEach(async () => {
    fakeExtension = new FakeGitExtension();
    (tokenService as any).onDidChange = (listener: () => unknown, bindThis: unknown) => {
      tokenChangeListener = () => listener.call(bindThis);
    };
  });

  it('remote source provider created for new token', async () => {
    tokenService.getInstanceUrls = () => ['https://test2.gitlab.com'];
    // TODO: maybe introduce something like an initialize method instead of doing the work in constructor
    // eslint-disable-next-line no-new
    new GitLabRemoteSourceProviderRepository(fakeExtension.gitApi as unknown as API);

    expect(fakeExtension.gitApi.remoteSourceProviders.length).toBe(1);

    tokenService.getInstanceUrls = () => ['https://test2.gitlab.com', 'https://test3.gitlab.com'];

    tokenChangeListener();

    expect(fakeExtension.gitApi.remoteSourceProviders.length).toBe(2);
  });

  it('remote source providers disposed after token removal', async () => {
    tokenService.getInstanceUrls = () => ['https://test2.gitlab.com', 'https://test3.gitlab.com'];
    // TODO: maybe introduce something like an initialize method instead of doing the work in constructor
    // eslint-disable-next-line no-new
    new GitLabRemoteSourceProviderRepository(fakeExtension.gitApi as unknown as API);

    expect(fakeExtension.gitApi.remoteSourceProviders.length).toBe(2);

    tokenService.getInstanceUrls = () => ['https://test2.gitlab.com'];

    tokenChangeListener();

    expect(fakeExtension.gitApi.remoteSourceProviders.length).toBe(1);
  });
});
