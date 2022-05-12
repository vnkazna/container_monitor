import { ExtensionContext } from 'vscode';
import { createAccount } from '../test_utils/entities';
import { SecretStorage } from '../test_utils/secret_storage';
import { Account } from './account';
import { AccountService } from './account_service';

type AccountMap = Record<string, Account | undefined>;
describe('AccountService', () => {
  let accountMap: AccountMap;
  let accountService: AccountService;
  let secrets: SecretStorage;
  beforeEach(async () => {
    accountMap = {};
    secrets = new SecretStorage();
    const fakeContext = {
      globalState: {
        get: () => accountMap,
        update: (name: string, am: AccountMap) => {
          accountMap = am;
        },
      },
      secrets,
    };
    accountService = new AccountService();
    await accountService.init(fakeContext as unknown as ExtensionContext);
  });

  it('adds account', async () => {
    const account = createAccount();
    await accountService.addAccount(account);

    expect(accountService.getAllAccounts()).toHaveLength(1);
    expect(accountService.getAllAccounts()).toEqual([account]);
  });

  it('does not add a duplicate account', async () => {
    const account = createAccount('https://gitlab.com', 1, 'abc');
    await accountService.addAccount(account);
    const duplicateAccount = createAccount('https://gitlab.com', 1, 'def');
    await accountService.addAccount(duplicateAccount);

    expect(accountService.getAllAccounts()).toHaveLength(1);
    expect(accountService.getAllAccounts()).toEqual([account]);
  });

  it('fails when some other process changed secrets', async () => {
    const account = createAccount('https://gitlab.com', 1, 'abc');
    await accountService.addAccount(account);
    await secrets.store('gitlab-tokens', '{}');
    await expect(accountService.addAccount(createAccount('https://gitlab.com', 2))).rejects.toThrow(
      /The GitLab secrets stored in your keychain have changed/,
    );
  });

  it('removes account', async () => {
    const account = createAccount();

    await accountService.addAccount(account);

    expect(accountService.getAllAccounts()).toHaveLength(1);

    await accountService.removeAccount(account.id);

    expect(accountService.getAllAccounts()).toHaveLength(0);
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
        id: 'https://gitlab.com|environment-variables',
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
        id: 'https://gitlab.com|environment-variables',
        instanceUrl: 'https://gitlab.com',
        token: 'abc',
        username: 'environment_variable_credentials',
      });
    });
  });

  it('can set and get one account', async () => {
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
