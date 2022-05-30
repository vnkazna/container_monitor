import { createTokenAccount } from '../test_utils/entities';
import { SecretStorage } from '../test_utils/secret_storage';
import { Account } from './account';
import { AccountService } from './account_service';

const SECRETS_KEY = 'gitlab-tokens';

type AccountMap = Record<string, Account | undefined>;
describe('AccountService', () => {
  let accountMap: AccountMap;
  let accountService: AccountService;
  let secrets: SecretStorage;
  let fakeContext: any;

  beforeEach(async () => {
    accountMap = {};
    secrets = new SecretStorage();
    fakeContext = {
      globalState: {
        get: () => accountMap,
        update: (name: string, am: AccountMap) => {
          accountMap = am;
        },
      },
      secrets,
    };
    accountService = new AccountService();
    await accountService.init(fakeContext);
  });

  it('adds account', async () => {
    const account = createTokenAccount();
    await accountService.addAccount(account);

    expect(accountService.getAllAccounts()).toHaveLength(1);
    expect(accountService.getAllAccounts()).toEqual([account]);
  });

  it('does not add a duplicate account', async () => {
    const account = createTokenAccount('https://gitlab.com', 1, 'abc');
    await accountService.addAccount(account);
    const duplicateAccount = createTokenAccount('https://gitlab.com', 1, 'def');
    await accountService.addAccount(duplicateAccount);

    expect(accountService.getAllAccounts()).toHaveLength(1);
    expect(accountService.getAllAccounts()).toEqual([account]);
  });

  it('fails when some other process changed secrets', async () => {
    const account = createTokenAccount('https://gitlab.com', 1, 'abc');
    await accountService.addAccount(account);
    await secrets.store('gitlab-tokens', '{}');
    await expect(
      accountService.addAccount(createTokenAccount('https://gitlab.com', 2)),
    ).rejects.toThrow(/The GitLab secrets stored in your keychain have changed/);
  });

  it('removes account', async () => {
    const account = createTokenAccount();

    await accountService.addAccount(account);

    expect(accountService.getAllAccounts()).toHaveLength(1);

    await accountService.removeAccount(account.id);

    expect(accountService.getAllAccounts()).toHaveLength(0);
    expect(await secrets.get(SECRETS_KEY)).toBe('{}');
  });

  it('offers account for removal even if it does not have a token', async () => {
    const account = createTokenAccount();

    await accountService.addAccount(account);

    await secrets.store(SECRETS_KEY, '{}');
    await accountService.init(fakeContext); // reload secrets from the store

    expect(accountService.getAllAccounts()).toHaveLength(0); // the account can't be used
    expect(accountService.getRemovableAccounts()).toHaveLength(1); // but it can be removed
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
        type: 'token',
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
        type: 'token',
      });
    });
  });

  it('can set and get one account', async () => {
    expect(accountService.getOneAccountForInstance('https://gitlab.com')).toBeUndefined();

    await accountService.addAccount(createTokenAccount('https://gitlab.com', 1, 'abc'));
    expect(accountService.getOneAccountForInstance('https://gitlab.com')?.token).toBe('abc');
  });

  it('can retrieve all instance URLs', async () => {
    await accountService.addAccount(createTokenAccount('https://gitlab.com', 1, 'abc'));
    await accountService.addAccount(createTokenAccount('https://dev.gitlab.com', 1, 'def'));
    expect(accountService.getRemovableAccounts().map(a => a.instanceUrl)).toEqual([
      'https://gitlab.com',
      'https://dev.gitlab.com',
    ]);
  });

  it('can get account based on ID', async () => {
    const firstAccount = createTokenAccount('https://gitlab.com', 1, 'abc');
    const secondAccount = createTokenAccount('https://dev.gitlab.com', 1, 'def');
    await accountService.addAccount(firstAccount);
    await accountService.addAccount(secondAccount);

    const result = accountService.getAccount(firstAccount.id);

    expect(result).toEqual(firstAccount);
  });

  it('can update token', async () => {
    const firstAccount = createTokenAccount('https://gitlab.com', 1, 'abc');
    const updatedTokenAccount = { ...firstAccount, token: 'xyz' };
    await accountService.addAccount(firstAccount);

    await accountService.updateAccountToken(updatedTokenAccount);

    const result = accountService.getAccount(firstAccount.id);

    expect(result).toEqual(updatedTokenAccount);
  });
});
