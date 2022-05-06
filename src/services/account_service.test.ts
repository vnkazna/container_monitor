import { ExtensionContext } from 'vscode';
import { createAccount } from '../test_utils/entities';
import { AccountService } from './account_service';

type TokenMap = Record<string, string | undefined>;

describe('AccountService', () => {
  let tokenMap: TokenMap;
  let accountService: AccountService;
  beforeEach(() => {
    tokenMap = {};
    const fakeContext = {
      globalState: {
        get: () => tokenMap,
        update: (name: string, tm: TokenMap) => {
          tokenMap = tm;
        },
      },
    };
    accountService = new AccountService();
    accountService.init(fakeContext as unknown as ExtensionContext);
  });

  /* This scenario happens when token was introduced before we started removing trailing slashes */
  it('can retrieve token if it was stored for url with trailing slash', async () => {
    tokenMap['https://gitlab.com/'] = 'abc';

    expect(accountService.getOneAccountForInstance('https://gitlab.com')?.token).toBe('abc');
  });

  describe('account from environment variable', () => {
    afterEach(() => {
      delete process.env.GITLAB_WORKFLOW_INSTANCE_URL;
      delete process.env.GITLAB_WORKFLOW_TOKEN;
    });

    it('adds account', () => {
      process.env.GITLAB_WORKFLOW_INSTANCE_URL = 'https://gitlab.com';
      process.env.GITLAB_WORKFLOW_TOKEN = 'abc';

      expect(accountService.getAllAccounts()).toHaveLength(1);

      expect(accountService.getAllAccounts()[0]).toEqual({
        id: 'https://gitlab.com',
        instanceUrl: 'https://gitlab.com',
        token: 'abc',
        username: 'environment_variable_credentials',
      });
    });

    it('sanitizes instance URL from env', () => {
      process.env.GITLAB_WORKFLOW_INSTANCE_URL = 'https://gitlab.com/';
      process.env.GITLAB_WORKFLOW_TOKEN = 'abc';

      expect(accountService.getAllAccounts()).toHaveLength(1);

      expect(accountService.getAllAccounts()[0]).toEqual({
        id: 'https://gitlab.com',
        instanceUrl: 'https://gitlab.com',
        token: 'abc',
        username: 'environment_variable_credentials',
      });
    });
  });

  it('sanitizes instance URLs stored with trailing slash', async () => {
    tokenMap['https://gitlab.com/'] = 'abc';

    expect(accountService.getAllAccounts()[0]).toEqual({
      id: 'https://gitlab.com',
      instanceUrl: 'https://gitlab.com',
      token: 'abc',
      username: 'GitLab user',
    });
  });
  it('can set and get one token', async () => {
    expect(accountService.getOneAccountForInstance('https://gitlab.com')).toBeUndefined();

    await accountService.addAccount(createAccount('https://gitlab.com', 1, 'abc'));
    expect(accountService.getOneAccountForInstance('https://gitlab.com')?.token).toBe('abc');
  });

  it('can retrieve all instance URLs', async () => {
    await accountService.addAccount(createAccount('https://gitlab.com', 1, 'abc'));
    await accountService.addAccount(createAccount('https://dev.gitlab.com', 1, 'def'));
    expect(accountService.getRemovableAccounts().map(a => a.instanceUrl)).toEqual([
      'https://gitlab.com',
      'https://dev.gitlab.com',
    ]);
  });
});
