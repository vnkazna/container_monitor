import assert from 'assert';
import { EventEmitter, ExtensionContext, Event } from 'vscode';
import { log } from '../log';
import { hasPresentKey } from '../utils/has_present_key';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';
import { removeTrailingSlash } from '../utils/remove_trailing_slash';
import { uniq } from '../utils/uniq';
import { Account, makeAccountId } from './account';
import { Credentials } from './credentials';

type AccountWithoutToken = Omit<Account, 'token'>;
interface Secret {
  token: string;
}

const getEnvironmentVariables = (): Credentials | undefined => {
  const { GITLAB_WORKFLOW_INSTANCE_URL, GITLAB_WORKFLOW_TOKEN } = process.env;
  if (!GITLAB_WORKFLOW_INSTANCE_URL || !GITLAB_WORKFLOW_TOKEN) return undefined;
  return {
    instanceUrl: removeTrailingSlash(GITLAB_WORKFLOW_INSTANCE_URL),
    token: GITLAB_WORKFLOW_TOKEN,
  };
};

const ACCOUNTS_KEY = 'glAccounts';
const SECRETS_KEY = 'gitlab-tokens';

const getEnvAccount = (): Account | undefined => {
  const credentials = getEnvironmentVariables();
  if (!credentials) return undefined;
  return {
    id: makeAccountId(credentials.instanceUrl, 'environment-variables'),
    username: 'environment_variable_credentials',
    ...credentials,
    type: 'token',
  };
};

const getSecrets = async (
  context: ExtensionContext,
): Promise<Record<string, Secret | undefined>> => {
  const stringTokens = await context.secrets.get(SECRETS_KEY);
  return stringTokens ? JSON.parse(stringTokens) : {};
};

export class AccountService {
  context?: ExtensionContext;

  secrets: Record<string, Secret | undefined> = {};

  private onDidChangeEmitter = new EventEmitter<void>();

  async init(context: ExtensionContext): Promise<void> {
    this.context = context;
    this.secrets = await getSecrets(context);
  }

  get onDidChange(): Event<void> {
    return this.onDidChangeEmitter.event;
  }

  private get accountMap(): Record<string, AccountWithoutToken | undefined> {
    assert(this.context);
    return this.context.globalState.get(ACCOUNTS_KEY, {});
  }

  getInstanceUrls(): string[] {
    return uniq(this.getAllAccounts().map(a => a.instanceUrl));
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
    const { accountMap } = this;

    if (accountMap[account.id]) {
      log.warn(
        `Account for instance ${account.instanceUrl} and user ${account.username} already exists. The extension ignored the request to re-add it.`,
      );
      return;
    }
    const { token, ...accountWithoutToken } = account;
    await this.#storeToken(account.id, token);

    await this.context.globalState.update(ACCOUNTS_KEY, {
      ...accountMap,
      [account.id]: accountWithoutToken,
    });

    this.onDidChangeEmitter.fire();
  }

  async #validateSecretsAreUpToDate() {
    assert(this.context);
    const storedSecrets = await getSecrets(this.context);
    assert.deepStrictEqual(
      this.secrets,
      storedSecrets,
      'The GitLab secrets stored in your keychain have changed. (Maybe another instance of VS Code or maybe OS synchronizing keychains.) Please restart VS Code.',
    );
  }

  async #removeToken(accountId: string) {
    assert(this.context);
    await this.#validateSecretsAreUpToDate();
    delete this.secrets[accountId];
    await this.context.secrets.store(SECRETS_KEY, JSON.stringify(this.secrets));
  }

  async #storeToken(accountId: string, token: string) {
    assert(this.context);
    await this.#validateSecretsAreUpToDate();
    const secrets = { ...this.secrets, [accountId]: { token } };
    await this.context.secrets.store(SECRETS_KEY, JSON.stringify(secrets));
    this.secrets = secrets;
  }

  async removeAccount(accountId: string) {
    assert(this.context);
    const { accountMap } = this;
    delete accountMap[accountId];

    await this.context.globalState.update(ACCOUNTS_KEY, accountMap);
    await this.#removeToken(accountId);
    this.onDidChangeEmitter.fire();
  }

  getRemovableAccounts(): Account[] {
    const accountsWithMaybeTokens = Object.values(this.accountMap)
      .filter(notNullOrUndefined)
      .map(a => ({ ...a, token: this.secrets[a.id]?.token }));
    accountsWithMaybeTokens
      .filter(a => !a.token)
      .forEach(a =>
        log.error(
          `Account for instance ${a.instanceUrl} and user ${a.username} is missing token in secret storage. Try to remove the account and add it again.`,
        ),
      );
    return accountsWithMaybeTokens.filter(hasPresentKey('token'));
  }
}

export const accountService: AccountService = new AccountService();
