import assert from 'assert';
import { EventEmitter, ExtensionContext, Event } from 'vscode';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';
import { removeTrailingSlash } from '../utils/remove_trailing_slash';
import { Account } from './account';
import { Credentials } from './credentials';

const getEnvironmentVariables = (): Credentials | undefined => {
  const { GITLAB_WORKFLOW_INSTANCE_URL, GITLAB_WORKFLOW_TOKEN } = process.env;
  if (!GITLAB_WORKFLOW_INSTANCE_URL || !GITLAB_WORKFLOW_TOKEN) return undefined;
  return {
    instanceUrl: GITLAB_WORKFLOW_INSTANCE_URL,
    token: GITLAB_WORKFLOW_TOKEN,
  };
};

const TOKENS_KEY = 'glTokens';
const ACCOUNTS_KEY = 'glAccounts';

const environmentTokenForInstance = (instanceUrl: string) =>
  instanceUrl === getEnvironmentVariables()?.instanceUrl
    ? getEnvironmentVariables()?.token
    : undefined;

const getEnvAccount = (): Account | undefined => {
  const credentials = getEnvironmentVariables();
  if (!credentials) return undefined;
  return {
    id: `${credentials.instanceUrl}-environment-variables`,
    username: 'environment_variable_credentials',
    ...credentials,
  };
};
export class AccountService {
  context?: ExtensionContext;

  private onDidChangeEmitter = new EventEmitter<void>();

  init(context: ExtensionContext): void {
    this.context = context;
  }

  get onDidChange(): Event<void> {
    return this.onDidChangeEmitter.event;
  }

  private get glTokenMap(): Record<string, string | undefined> {
    assert(this.context);
    return this.context.globalState.get(TOKENS_KEY, {});
  }

  private get accountMap(): Record<string, Account | undefined> {
    assert(this.context);
    return this.context.globalState.get(ACCOUNTS_KEY, {});
  }

  getInstanceUrls(): string[] {
    return [...this.getRemovableInstanceUrls(), getEnvironmentVariables()?.instanceUrl].filter(
      notNullOrUndefined,
    );
  }

  getRemovableInstanceUrls(): string[] {
    return Object.keys(this.glTokenMap);
  }

  getToken(instanceUrl: string): string | undefined {
    // the first part of the return (`this.glTokenMap[instanceUrl]`)
    // can be removed on 2022-08-15 (year after new tokens can't contain trailing slash)
    return (
      this.glTokenMap[instanceUrl] ||
      this.glTokenMap[removeTrailingSlash(instanceUrl)] ||
      environmentTokenForInstance(instanceUrl)
    );
  }

  getAllCredentials(): Credentials[] {
    return this.getInstanceUrls().map(instanceUrl => ({
      instanceUrl,
      token: this.getToken(instanceUrl)!,
    }));
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

  async setToken(instanceUrl: string, token: string | undefined): Promise<void> {
    assert(this.context);
    const tokenMap = this.glTokenMap;

    if (token) {
      tokenMap[removeTrailingSlash(instanceUrl)] = token;
    } else {
      delete tokenMap[instanceUrl];
    }

    await this.context.globalState.update(TOKENS_KEY, tokenMap);
    this.onDidChangeEmitter.fire();
  }
}

export const accountService: AccountService = new AccountService();
