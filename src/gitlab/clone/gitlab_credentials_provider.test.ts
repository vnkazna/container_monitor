import * as vscode from 'vscode';
import { tokenService } from '../../services/token_service';
import { GITLAB_URL } from '../../../test/integration/test_infrastructure/constants';
import { gitlabCredentialsProvider } from './gitlab_credentials_provider';

jest.mock('../../services/token_service');

describe('GitLab Credentials Provider', () => {
  beforeEach(() => {
    tokenService.getInstanceUrls = () => [GITLAB_URL];
    tokenService.getToken = (url: string) => (url === GITLAB_URL ? 'password' : undefined);
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
