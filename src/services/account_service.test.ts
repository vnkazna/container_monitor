import { ExtensionContext } from 'vscode';
import { testAccount } from '../test_utils/test_account';
import { Account } from './account';
import { AccountService } from './account_service';
import { CredentialsMigrator } from './credentials_migrator';

jest.mock('./credentials_migrator');

type AccountMap = Record<string, Account | undefined>;

describe('AccountService', () => {
  let accountMap: AccountMap;
  let accountService: AccountService;

  beforeEach(async () => {
    accountMap = {};
    const fakeContext = {
      globalState: {
        get: () => accountMap,
        update: (name: string, am: AccountMap) => {
          accountMap = am;
        },
      },
    };
    accountService = new AccountService();
    await accountService.init(fakeContext as unknown as ExtensionContext);
    delete process.env.GITLAB_WORKFLOW_INSTANCE_URL;
    delete process.env.GITLAB_WORKFLOW_TOKEN;
  });

  it('runs migrator', () => {
    expect(CredentialsMigrator).toHaveBeenCalled();
  });

  it('adds account', async () => {
    const account = testAccount();
    await accountService.addAccount(account);

    expect(accountService.getAllAccounts()).toHaveLength(1);
    expect(accountService.getAllAccounts()).toEqual([account]);
  });

  it('removes account', async () => {
    const account = testAccount();

    await accountService.addAccount(account);

    expect(accountService.getAllAccounts()).toHaveLength(1);

    await accountService.removeAccount(account.id);

    expect(accountService.getAllAccounts()).toHaveLength(0);
  });

  it('adds account from env', () => {
    process.env.GITLAB_WORKFLOW_INSTANCE_URL = 'https://gitlab.com';
    process.env.GITLAB_WORKFLOW_TOKEN = 'abc';

    expect(accountService.getAllAccounts()).toHaveLength(1);

    expect(accountService.getAllAccounts()[0]).toEqual({
      id: 'https://gitlab.com-environment-variables',
      instanceUrl: 'https://gitlab.com',
      token: 'abc',
      username: 'environment_variable_credentials',
    });
  });

  it('can retrieve all instance URLs', async () => {
    await accountService.addAccount(testAccount('https://instance1.com'));
    await accountService.addAccount(testAccount('https://instance2.com'));
    expect(accountService.getInstanceUrls()).toEqual([
      'https://instance1.com',
      'https://instance2.com',
    ]);
  });
});
