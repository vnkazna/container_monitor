import { Account } from '../accounts/account';
import { AccountService, accountService } from '../accounts/account_service';
import { Credentials } from '../accounts/credentials';
import { GitLabService } from './gitlab_service';

export class RefreshingGitLabService extends GitLabService {
  #accountId: string;

  #accountService: AccountService;

  constructor(account: Account, as = accountService) {
    super({ instanceUrl: account.instanceUrl, token: account.token });
    this.#accountId = account.id;
    this.#accountService = as;
  }

  async getCredentials(): Promise<Credentials> {
    return this.#accountService.getAccount(this.#accountId);
  }
}
