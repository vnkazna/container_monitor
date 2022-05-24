import assert from 'assert';
import { Account, makeAccountId, OAuthAccount } from '../accounts/account';
import { accountService, AccountService } from '../accounts/account_service';
import { GITLAB_COM_URL } from '../constants';
import { AuthorizationCodeTokenExchangeParams, GitLabService } from './gitlab_service';

export const needsRefresh = (account: Account) => {
  if (account.type === 'token') return false;
  const unixTimestampNow = Math.floor(new Date().getTime() / 1000);
  return account.expiresAtTimestampInSeconds <= unixTimestampNow; // subtract 7170 from expiresAtTimestampInSeconds to simulate expiration every 30s
};

export class TokenExchangeService {
  #accountService: AccountService;

  #refreshesInProgress: Record<string, Promise<Account> | undefined> = {};

  constructor(as = accountService) {
    this.#accountService = as;
  }

  async createOAuthAccountFromCode(
    params: AuthorizationCodeTokenExchangeParams & { scopes: readonly string[] },
  ): Promise<OAuthAccount> {
    const { code, codeVerifier } = params;
    const tokenResponse = await GitLabService.exchangeToken({
      instanceUrl: GITLAB_COM_URL,
      grantType: 'authorization_code',
      code,
      codeVerifier,
    });
    const user = await new GitLabService({
      instanceUrl: GITLAB_COM_URL,
      token: tokenResponse.access_token,
    }).getCurrentUser();
    const account: OAuthAccount = {
      instanceUrl: GITLAB_COM_URL,
      token: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAtTimestampInSeconds: tokenResponse.created_at + tokenResponse.expires_in,
      codeVerifier,
      id: makeAccountId(GITLAB_COM_URL, user.id),
      type: 'oauth',
      username: user.username,
      scopes: [...params.scopes],
    };
    await this.#accountService.addAccount(account);
    return account;
  }

  async refreshIfNeeded(accountId: string): Promise<Account> {
    const latestAccount = this.#accountService.getAccount(accountId);
    if (!needsRefresh(latestAccount)) {
      // log.debug(`Using non-expired account ${JSON.stringify(latestAccount)}`);
      return latestAccount;
    }
    const refreshInProgress = this.#refreshesInProgress[accountId];
    if (refreshInProgress) return refreshInProgress;
    assert(latestAccount.type === 'oauth');
    // log.debug(`Refreshing expired account ${JSON.stringify(latestAccount)}.`);
    const refresh = this.#refreshToken(latestAccount).finally(() => {
      delete this.#refreshesInProgress[accountId];
    });
    this.#refreshesInProgress[accountId] = refresh;
    return refresh;
  }

  async #refreshToken(account: OAuthAccount): Promise<OAuthAccount> {
    const { codeVerifier, instanceUrl, refreshToken } = account;
    const response = await GitLabService.exchangeToken({
      grantType: 'refresh_token',
      codeVerifier,
      instanceUrl,
      refreshToken,
    });
    const refreshedAccount: OAuthAccount = {
      ...account,
      token: response.access_token,
      refreshToken: response.refresh_token,
      expiresAtTimestampInSeconds: response.created_at + response.expires_in, // FIXME: this logic is duplicated in the gitlab_authentication_provider
    };
    await this.#accountService.updateAccount(refreshedAccount);
    // log.debug(`Saved refreshed account ${JSON.stringify(refreshedAccount)}.`);
    return refreshedAccount;
  }
}

export const tokenExchangeService = new TokenExchangeService();
