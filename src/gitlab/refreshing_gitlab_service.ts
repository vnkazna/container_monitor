import assert from 'assert';
import { Account, needsRefresh, OAuthAccount } from '../accounts/account';
import { AccountService, accountService } from '../accounts/account_service';
import { Credentials } from '../accounts/credentials';
import { GitLabService } from './gitlab_service';

export class RefreshingGitLabService extends GitLabService {
  #account: Account;

  #accountService: AccountService;

  constructor(account: Account, as = accountService) {
    super({ instanceUrl: account.instanceUrl, token: account.token });
    this.#account = account;
    this.#accountService = as;
  }

  async getCredentials(): Promise<Credentials> {
    if (needsRefresh(this.#account)) {
      // FIXME: this block can happen only once per instance, if it's invoked multiple times, we'll loose the token
      assert(this.#account.type === 'oauth');
      const { codeVerifier, instanceUrl, refreshToken } = this.#account;
      const response = await GitLabService.exchangeToken({
        grantType: 'refresh_token',
        codeVerifier,
        instanceUrl,
        refreshToken,
      });
      const newAccount: OAuthAccount = {
        ...this.#account,
        refreshToken: response.refresh_token,
        expiresAtTimestampInSeconds: response.created_at + response.expires_in,
      };
      await this.#accountService.removeAccount(newAccount.id);
      await this.#accountService.addAccount(newAccount);
      this.#account = newAccount;
    }
    return this.#account;
  }
}
