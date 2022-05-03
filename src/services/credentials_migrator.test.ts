import { ExtensionContext } from 'vscode';
import { user } from '../test_utils/entities';
import { Account } from './account';
import { Credentials } from './credentials';
import { CredentialsMigrator } from './credentials_migrator';

/*
  These keys are not imported from the production code because they are
  already present on users' computers and can't be changed. We want tests
  to fail if they change.
*/
const TOKENS_KEY = 'glTokens';
const MIGRATED_CREDENTIALS = 'glMigratedCredentials';

describe('CredentialsMigrator', () => {
  let globalStateContent: Record<string, any>;
  let accounts: Record<string, Account>;
  let migrator: CredentialsMigrator;
  let users: Record<string, RestUser>;

  const addAccount = async (a: Account) => {
    accounts[a.id] = a;
  };
  const getUser = async (c: Credentials) => {
    const user = users[`${c.instanceUrl}-${c.token}`];
    if (!user) throw new Error('no user');
    return user;
  };
  const accountExists = (a: Account) => Object.keys(a).includes(a.id);

  beforeEach(() => {
    globalStateContent = { [TOKENS_KEY]: [], [MIGRATED_CREDENTIALS]: [] };
    const fakeContext = {
      globalState: {
        get: (key: string, defaultVal: any) => globalStateContent[key] || defaultVal,
        update: async (key: string, value: any) => {
          globalStateContent[key] = value;
        },
      },
    } as unknown as ExtensionContext;
    accounts = {};
    users = {};
    migrator = new CredentialsMigrator(fakeContext, addAccount, accountExists, getUser);
  });

  it('migrates credentials', async () => {
    globalStateContent[TOKENS_KEY] = { 'https://gitlab.com': 'abc' };
    users = { 'https://gitlab.com-abc': user };

    await migrator.migrate();

    expect(Object.values(accounts)).toHaveLength(1);
    expect(accounts['https://gitlab.com-123'].instanceUrl).toBe('https://gitlab.com');
  });

  it('removes trailing slash for token instance URL', async () => {
    globalStateContent[TOKENS_KEY] = { 'https://gitlab.com/': 'abc' };
    users = { 'https://gitlab.com-abc': user };

    await migrator.migrate();

    expect(Object.values(accounts)).toHaveLength(1);
    expect(accounts['https://gitlab.com-123'].instanceUrl).toBe('https://gitlab.com');
  });

  it('does not migrate credentials twice', async () => {
    globalStateContent[TOKENS_KEY] = { 'https://gitlab.com/': 'abc' };
    users = { 'https://gitlab.com-abc': user };

    await migrator.migrate();

    expect(Object.values(accounts)).toHaveLength(1);

    await migrator.migrate();

    expect(Object.values(accounts)).toHaveLength(1);
  });

  it('tries to migrate credentials until it succeeds', async () => {
    globalStateContent[TOKENS_KEY] = { 'https://gitlab.com/': 'abc' };

    await migrator.migrate(); // the API call to get user will fail

    expect(Object.values(accounts)).toHaveLength(0);

    users = { 'https://gitlab.com-abc': user }; // now we add the user

    await migrator.migrate();

    expect(Object.values(accounts)).toHaveLength(1);
  });
});
