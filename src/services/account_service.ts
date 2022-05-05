import assert from 'assert';
import { EventEmitter, ExtensionContext, Event } from 'vscode';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';
import { removeTrailingSlash } from '../utils/remove_trailing_slash';
import { Account } from './account';
import { Credentials } from './credentials';

const getEnvironmentVariables = () => {
  const { GITLAB_WORKFLOW_INSTANCE_URL, GITLAB_WORKFLOW_TOKEN } = process.env;
  if (!GITLAB_WORKFLOW_INSTANCE_URL || !GITLAB_WORKFLOW_TOKEN) return undefined;
  return {
    instanceUrl: GITLAB_WORKFLOW_INSTANCE_URL,
    token: GITLAB_WORKFLOW_TOKEN,
  };
};

const environmentTokenForInstance = (instanceUrl: string) =>
  instanceUrl === getEnvironmentVariables()?.instanceUrl
    ? getEnvironmentVariables()?.token
    : undefined;

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
    return this.context.globalState.get('glTokens', {});
  }

  getInstanceUrls(): string[] {
    return [...this.#getRemovableInstanceUrls(), getEnvironmentVariables()?.instanceUrl].filter(
      notNullOrUndefined,
    );
  }

  #getRemovableInstanceUrls(): string[] {
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

  async addAccount(account: Account) {
    assert(this.context);
    const tokenMap = this.glTokenMap;

    tokenMap[account.instanceUrl] = account.token;

    await this.context.globalState.update('glTokens', tokenMap);
    this.onDidChangeEmitter.fire();
  }

  async removeAccount(accountId: string) {
    assert(this.context);
    const tokenMap = this.glTokenMap;

    delete tokenMap[removeTrailingSlash(accountId)]; // TODO: remove this sanitization once we use real accounts

    await this.context.globalState.update('glTokens', tokenMap);
    this.onDidChangeEmitter.fire();
  }

  getRemovableAccounts(): Account[] {
    return this.#getRemovableInstanceUrls().map(instanceUrl => ({
      id: instanceUrl,
      instanceUrl,
      token: this.getToken(instanceUrl)!,
      username: 'GitLab user',
    }));
  }
}

export const accountService: AccountService = new AccountService();
