import assert from 'assert';
import { Account, OAuthAccount } from '../accounts/account';
import { accountService, AccountService } from '../accounts/account_service';
import { GitLabService } from './gitlab_service';

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

  async refreshIfNeeded(accountId: string): Promise<Account> {
    const latestAccount = this.#accountService.getAccount(accountId);
    if (!needsRefresh(latestAccount)) {
      // log.debug(`Using non-expired account ${JSON.stringify(latestAccount)}`);
      return latestAccount;
    }
    assert(latestAccount.type === 'oauth');
    // log.debug(`Refreshing expired account ${JSON.stringify(latestAccount)}.`);
    const refreshInProgress = this.#refreshesInProgress[accountId];
    if (refreshInProgress) return refreshInProgress;
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
