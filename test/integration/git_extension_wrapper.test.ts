import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { tokenService } from '../../src/services/token_service';
import { GITLAB_URL } from './test_infrastructure/constants';
import { GitExtension } from '../../src/api/git';
import { GitExtensionWrapper } from '../../src/git/git_extension_wrapper';

const token = 'abcd-secret';

describe('GitExtensionWrapper', () => {
  const sandbox = sinon.createSandbox();

  before(async () => {
    await tokenService.setToken(GITLAB_URL, token);
  });

  afterEach(async () => {
    sandbox.restore();
  });

  after(async () => {
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  it('remote source provider created', async () => {
    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
    if (gitExtension) {
      const gitAPI = gitExtension.getAPI(1);

      const fakeDispose = sinon.fake();
      const fakeRegisterRemoteSourceProvider = sinon.fake(() => ({ dispose: fakeDispose }));

      sandbox.replace(gitAPI, 'registerRemoteSourceProvider', fakeRegisterRemoteSourceProvider);
      const getApi = () => gitAPI;
      sandbox.replace(gitExtension, 'getAPI', getApi);

      const gitExtensionWrapper = new GitExtensionWrapper(gitExtension);

      assert.strictEqual(
        fakeRegisterRemoteSourceProvider.callCount,
        1,
        'One remote source provider should have been created',
      );

      gitExtensionWrapper.dispose();
    } else {
      fail('Git API not available');
    }
  });

  it('remote source provider created for new token', async () => {
    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
    if (gitExtension) {
      const gitAPI = gitExtension.getAPI(1);

      const fakeDispose = sinon.fake();
      const fakeRegisterRemoteSourceProvider = sinon.fake(() => ({ dispose: fakeDispose }));

      sandbox.replace(gitAPI, 'registerRemoteSourceProvider', fakeRegisterRemoteSourceProvider);
      const getApi = () => gitAPI;
      sandbox.replace(gitExtension, 'getAPI', getApi);

      const gitExtensionWrapper = new GitExtensionWrapper(gitExtension);

      await tokenService.setToken('https://test2.gitlab.com', 'abcde');

      assert.strictEqual(
        fakeRegisterRemoteSourceProvider.callCount,
        2,
        'After a newly added token, two remote source providers should have been created',
      );

      await tokenService.setToken('https://test2.gitlab.com', undefined);
      gitExtensionWrapper.dispose();
    } else {
      fail('Git API not available');
    }
  });

  it('remote source providers disposed after token removal', async () => {
    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
    if (gitExtension) {
      const gitAPI = gitExtension.getAPI(1);

      const fakeDispose = sinon.fake();
      const fakeRegisterRemoteSourceProvider = sinon.fake(() => ({ dispose: fakeDispose }));

      sandbox.replace(gitAPI, 'registerRemoteSourceProvider', fakeRegisterRemoteSourceProvider);
      const getApi = () => gitAPI;
      sandbox.replace(gitExtension, 'getAPI', getApi);

      const gitExtensionWrapper = new GitExtensionWrapper(gitExtension);

      await tokenService.setToken('https://test2.gitlab.com', 'abcde');
      await tokenService.setToken('https://test2.gitlab.com', undefined);

      assert.strictEqual(
        fakeDispose.callCount,
        1,
        'After removing a token, the remote source provider should be disposed',
      );

      gitExtensionWrapper.dispose();
    } else {
      fail('Git API not available');
    }
  });

  it('credentials provider is created', async () => {
    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
    if (gitExtension) {
      const gitAPI = gitExtension.getAPI(1);

      const apiMock = sinon.mock(gitAPI);
      apiMock.expects('registerCredentialsProvider').once();
      const getApi = () => gitAPI;

      sandbox.replace(gitExtension, 'getAPI', getApi);

      const gitlabProviderManager = new GitExtensionWrapper(gitExtension);

      apiMock.verify();
      apiMock.restore();

      gitlabProviderManager.dispose();
    } else {
      fail('Git API not available');
    }
  });
});
