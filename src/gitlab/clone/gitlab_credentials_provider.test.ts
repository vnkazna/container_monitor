import * as vscode from 'vscode';
import { accountService } from '../../services/account_service';
import { GITLAB_URL } from '../../../test/integration/test_infrastructure/constants';
import { gitlabCredentialsProvider } from './gitlab_credentials_provider';

jest.mock('../../services/account_service');

describe('GitLab Credentials Provider', () => {
  beforeEach(() => {
    accountService.getInstanceUrls = () => [GITLAB_URL];
    accountService.getToken = (url: string) => (url === GITLAB_URL ? 'password' : undefined);
  });

  it('getting credentials works', async () => {
    expect(
      (await gitlabCredentialsProvider.getCredentials(vscode.Uri.parse(GITLAB_URL)))?.password,
    ).toBe('password');
  });

  it('returns undefined for url without token', async () => {
    expect(
      await gitlabCredentialsProvider.getCredentials(vscode.Uri.parse('https://invalid.com')),
    ).toBe(undefined);
  });
});
