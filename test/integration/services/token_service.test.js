const assert = require('assert');
const { TokenService } = require('../../../src/services/token_service');

describe('TokenService', () => {
  let tokenService;

  beforeEach(() => {
    let tokens = {};
    const fakeContext = {
      globalState: {
        get: () => tokens,
        update: (_, val) => {
          tokens = val;
        },
      },
    };
    tokenService = new TokenService(fakeContext);
  });

  it('can set and get one token', async () => {
    assert.strictEqual(tokenService.getToken('https://gitlab.com'), undefined);

    tokenService.setToken('https://gitlab.com', 'abc');
    assert.strictEqual(tokenService.getToken('https://gitlab.com'), 'abc');
  });

  it('can retrieve all instance URLs', async () => {
    tokenService.setToken('https://gitlab.com', 'abc');
    tokenService.setToken('https://dev.gitlab.com', 'def');
    assert.deepStrictEqual(tokenService.instanceUrls, [
      'https://gitlab.com',
      'https://dev.gitlab.com',
    ]);
  });
});
