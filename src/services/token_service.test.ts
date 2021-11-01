import { ExtensionContext } from 'vscode';
import { TokenService } from './token_service';

type TokenMap = Record<string, string | undefined>;

describe('TokenService', () => {
  let tokenMap: TokenMap;
  let tokenService: TokenService;
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
    tokenService = new TokenService();
    tokenService.init(fakeContext as unknown as ExtensionContext);
  });

  it.each`
    storedFor                | retrievedFor
    ${'https://gitlab.com'}  | ${'https://gitlab.com'}
    ${'https://gitlab.com'}  | ${'https://gitlab.com/'}
    ${'https://gitlab.com/'} | ${'https://gitlab.com'}
    ${'https://gitlab.com/'} | ${'https://gitlab.com/'}
  `(
    'when token stored for $storedFor, it can be retrieved for $retrievedFor',
    async ({ storedFor, retrievedFor }) => {
      await tokenService.setToken(storedFor, 'abc');

      expect(tokenService.getToken(retrievedFor)).toBe('abc');
    },
  );

  /* This scenario happens when token was introduced before we started removing trailing slashes */
  it('can retrieve token if it was stored for url with trailing slash', async () => {
    tokenMap['https://gitlab.com/'] = 'abc';

    expect(tokenService.getToken('https://gitlab.com/')).toBe('abc');
  });
});
