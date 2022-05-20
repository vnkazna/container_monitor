import { Account } from '../accounts/account';
import { Credentials } from '../accounts/credentials';
import { GitLabService } from './gitlab_service';

export class RefreshingGitLabService extends GitLabService {
  #account: Account;

  constructor(account: Account) {
    super({ instanceUrl: account.instanceUrl, token: account.token });
    this.#account = account;
  }

  async getCredentials(): Promise<Credentials> {
    return this.#account;
  }
}
