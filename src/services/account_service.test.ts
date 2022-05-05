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

  it.each`
    storedFor               | retrievedFor
    ${'https://gitlab.com'} | ${'https://gitlab.com'}
    ${'https://gitlab.com'} | ${'https://gitlab.com/'}
  `(
    'when token stored for $storedFor, it can be retrieved for $retrievedFor',
    async ({ storedFor, retrievedFor }) => {
      await accountService.addAccount({
        id: storedFor,
        instanceUrl: storedFor,
        token: 'abc',
        username: 'username',
      });

      expect(accountService.getToken(retrievedFor)).toBe('abc');
    },
  );

  /* This scenario happens when token was introduced before we started removing trailing slashes */
  it('can retrieve token if it was stored for url with trailing slash', async () => {
    tokenMap['https://gitlab.com/'] = 'abc';

    expect(accountService.getToken('https://gitlab.com/')).toBe('abc');
  });

  it('can set and get one token', async () => {
    expect(accountService.getToken('https://gitlab.com')).toBeUndefined();

    await accountService.addAccount(createAccount('https://gitlab.com', 1, 'abc'));
    expect(accountService.getToken('https://gitlab.com')).toBe('abc');
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
