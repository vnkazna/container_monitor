import assert from 'assert';
import { EventEmitter, ExtensionContext, Event } from 'vscode';
import { log } from '../log';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';
import { removeTrailingSlash } from '../utils/remove_trailing_slash';
import { uniq } from '../utils/uniq';
import { Account, makeAccountId } from './account';
import { Credentials } from './credentials';

const getEnvironmentVariables = (): Credentials | undefined => {
  const { GITLAB_WORKFLOW_INSTANCE_URL, GITLAB_WORKFLOW_TOKEN } = process.env;
  if (!GITLAB_WORKFLOW_INSTANCE_URL || !GITLAB_WORKFLOW_TOKEN) return undefined;
  return {
    instanceUrl: removeTrailingSlash(GITLAB_WORKFLOW_INSTANCE_URL),
    token: GITLAB_WORKFLOW_TOKEN,
  };
};

const environmentTokenForInstance = (instanceUrl: string) =>
  instanceUrl === getEnvironmentVariables()?.instanceUrl
    ? getEnvironmentVariables()?.token
    : undefined;

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
    return uniq(this.getAllAccounts().map(a => a.instanceUrl));
  }

  #getRemovableInstanceUrls(): string[] {
    return Object.keys(this.glTokenMap).map(removeTrailingSlash);
  }

  #getToken(instanceUrl: string): string | undefined {
    // the first part of the return (`this.glTokenMap[instanceUrl]`)
    // can be removed on 2022-08-15 (year after new tokens can't contain trailing slash)
    return (
      this.glTokenMap[instanceUrl] ||
      this.glTokenMap[`${instanceUrl}/`] ||
      environmentTokenForInstance(instanceUrl)
    );
  }

  /**
   * This method returns account for given instance URL or undefined if there is no such account.
   * If there are multiple accounts for the instance we'll log warning and use the first one.
   * @deprecated This method is used only for compatibility with legacy single-account logic. Handle the possibility of multiple accounts for the same instance!
   * @param instanceUrl
   * @returns The first account for this instance URL
   */
  getOneAccountForInstance(instanceUrl: string): Account | undefined {
    const accounts = this.getAllAccounts().filter(a => a.instanceUrl === instanceUrl);
    if (accounts.length > 1)
      log.warn(
        `There are multiple accounts for ${instanceUrl}.` +
          `Extension will use the one for user ${accounts[0].username}`,
      );
    return accounts[0];
  }

  getAllAccounts(): Account[] {
    return [...this.getRemovableAccounts(), getEnvAccount()].filter(notNullOrUndefined);
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
      token: this.#getToken(instanceUrl)!,
      username: 'GitLab user',
    }));
  }
}

export const accountService: AccountService = new AccountService();
