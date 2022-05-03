import assert from 'assert';
import { EventEmitter, ExtensionContext, Event } from 'vscode';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';
import { uniq } from '../utils/uniq';
import { Account, makeAccountId } from './account';
import { Credentials } from './credentials';
import { CredentialsMigrator } from './credentials_migrator';

const getEnvironmentVariables = (): Credentials | undefined => {
  const { GITLAB_WORKFLOW_INSTANCE_URL, GITLAB_WORKFLOW_TOKEN } = process.env;
  if (!GITLAB_WORKFLOW_INSTANCE_URL || !GITLAB_WORKFLOW_TOKEN) return undefined;
  return {
    instanceUrl: GITLAB_WORKFLOW_INSTANCE_URL,
    token: GITLAB_WORKFLOW_TOKEN,
  };
};

const ACCOUNTS_KEY = 'glAccounts';

const getEnvAccount = (): Account | undefined => {
  const credentials = getEnvironmentVariables();
  if (!credentials) return undefined;
  return {
    id: makeAccountId(credentials.instanceUrl, 'environment-variables'),
    username: 'environment_variable_credentials',
    ...credentials,
  };
};

export class AccountService {
  context?: ExtensionContext;

  private onDidChangeEmitter = new EventEmitter<void>();

  async init(context: ExtensionContext): Promise<void> {
    this.context = context;
    const migrator = new CredentialsMigrator(
      context,
      a => this.addAccount(a),
      a => Boolean(this.accountMap[a.id]),
    );
    await migrator.migrate();
  }

  get onDidChange(): Event<void> {
    return this.onDidChangeEmitter.event;
  }

  private get accountMap(): Record<string, Account | undefined> {
    assert(this.context);
    return this.context.globalState.get(ACCOUNTS_KEY, {});
  }

  getInstanceUrls(): string[] {
    return uniq(this.getAllAccounts().map(a => a.instanceUrl));
  }

  getToken(instanceUrl: string): string | undefined {
    throw new Error('not implemented');
  }

  getAllCredentials(): Credentials[] {
    return [];
  }

  getRemovableAccounts(): Account[] {
    return Object.values(this.accountMap).filter(notNullOrUndefined);
  }

  getAllAccounts(): Account[] {
    return [...Object.values(this.accountMap), getEnvAccount()].filter(notNullOrUndefined);
  }

  async addAccount(account: Account) {
    assert(this.context);
    const { accountMap } = this;
    // FIXME: handle duplicates
    accountMap[account.id] = account;

    await this.context.globalState.update(ACCOUNTS_KEY, accountMap);

    this.onDidChangeEmitter.fire();
  }

  async removeAccount(accountId: string) {
    assert(this.context);
    const { accountMap } = this;
    delete accountMap[accountId];

    await this.context.globalState.update(ACCOUNTS_KEY, accountMap);
    this.onDidChangeEmitter.fire();
  }
}

export const accountService: AccountService = new AccountService();
