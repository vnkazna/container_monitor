import vscode from 'vscode';
import { FetchError } from './errors/fetch_error';
import { GitLabService } from './gitlab/gitlab_service';
import { accountService } from './services/account_service';
import { asMock } from './test_utils/as_mock';
import { showInput } from './token_input';

jest.mock('./gitlab/gitlab_service');
jest.mock('./services/account_service');

describe('token input', () => {
  describe('showInput', () => {
    const mockGetCurrentUserResponse = (response: any) => {
      asMock(GitLabService).mockImplementation(() => ({
        getCurrentUser: () => response,
      }));
    };

    beforeEach(() => {
      // simulate user filling in instance URL and token
      asMock(vscode.window.showInputBox).mockImplementation(async (options: any) =>
        options.password ? 'token' : 'instanceUrl',
      );
    });
    it('adds token', async () => {
      // simulate API returning user for the instance url and token
      mockGetCurrentUserResponse({ username: 'testname' });

      await showInput();

      expect(GitLabService).toHaveBeenCalledWith({ instanceUrl: 'instanceUrl', token: 'token' });
      expect(accountService.setToken).toHaveBeenCalledWith('instanceUrl', 'token');
    });
    it('handles Unauthorized error', async () => {
      // simulate API failing with Unauthorized
      mockGetCurrentUserResponse(Promise.reject(new FetchError('', { status: 401 } as Response)));

      await expect(showInput()).rejects.toThrowError(/.*Unauthorized.*/);
    });
    it('handles fetch error', async () => {
      // simulate API returning error response
      mockGetCurrentUserResponse(Promise.reject(new FetchError('', { status: 404 } as Response)));

      await expect(showInput()).rejects.toThrowError(/.*Request failed.*/);
    });
  });
});
