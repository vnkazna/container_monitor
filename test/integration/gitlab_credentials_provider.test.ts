import * as assert from 'assert';
import * as vscode from 'vscode';
import { tokenService } from '../../src/services/token_service';
import { GITLAB_URL } from './test_infrastructure/constants';
import { gitlabCredentialsProvider } from '../../src/gitlab/clone/gitlab_credentials_provider';

const token = 'abcd-secret';

describe('GitLab Credentials Provider', () => {
  before(async () => {
    await tokenService.setToken(GITLAB_URL, token);
  });

  after(async () => {
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  it('getting credentials works', async () => {
    assert.deepStrictEqual(
      (await gitlabCredentialsProvider.getCredentials(vscode.Uri.parse(GITLAB_URL)))?.password,
      token,
      'Username and token should be equal',
    );
  });

  it('returns undefined for url without token', async () => {
    assert.deepStrictEqual(
      await gitlabCredentialsProvider.getCredentials(vscode.Uri.parse('https://invalid.com')),
      undefined,
      'there should be no user at invalid url',
    );
  });

  it('newly created token is used', async () => {
    const temporaryToken = 'token';
    await tokenService.setToken('https://test2.gitlab.com', temporaryToken);

    assert.deepStrictEqual(
      (await gitlabCredentialsProvider.getCredentials(vscode.Uri.parse('https://test2.gitlab.com')))
        ?.password,
      temporaryToken,
      'Username and token should be equal',
    );

    await tokenService.setToken('https://test2.gitlab.com', undefined);
  });
});
