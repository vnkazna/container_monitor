import assert from 'assert';
import { EventEmitter, ExtensionContext, Event } from 'vscode';
import { UserFriendlyError } from '../errors/user_friendly_error';
import { log } from '../log';
import { hasPresentKey } from '../utils/has_present_key';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';
import { removeTrailingSlash } from '../utils/remove_trailing_slash';
import { uniq } from '../utils/uniq';
import { Account, makeAccountId, OAuthAccount, TokenAccount } from './account';
import { Credentials } from './credentials';

interface TokenSecret {
  token: string;
}

interface OAuthSecret {
  token: string;
  refreshToken: string;
  expiresAtTimestampInSeconds: number;
}
type Secret = TokenSecret | OAuthSecret;

type AccountWithoutSecret =
  | Omit<TokenAccount, keyof TokenSecret>
  | Omit<OAuthAccount, keyof OAuthSecret>;

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

const splitAccount = (
  account: Account,
): { accountWithoutSecret: AccountWithoutSecret; secret: Secret } => {
  if (account.type === 'token') {
    const { token, ...accountWithoutSecret } = account;
    return { accountWithoutSecret, secret: { token } };
  }
  if (account.type === 'oauth') {
    const { token, refreshToken, expiresAtTimestampInSeconds, ...accountWithoutSecret } = account;
    return { accountWithoutSecret, secret: { token, refreshToken, expiresAtTimestampInSeconds } };
  }
  throw new Error(`Unexpected account type for account ${JSON.stringify(account)}`);
};

export class AccountService {
  context?: ExtensionContext;

  secrets: Record<string, Secret | undefined> = {};

  private onDidChangeEmitter = new EventEmitter<void>();

  async init(context: ExtensionContext): Promise<void> {
    this.context = context;
    try {
      this.secrets = await getSecrets(context);
    } catch (error) {
      throw new UserFriendlyError(
        `GitLab Workflow can't access the OS Keychain. If you use Ubuntu, see this [existing issue](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/580).`,
        error,
      );
    }
  }

  get onDidChange(): Event<void> {
    return this.onDidChangeEmitter.event;
  }

  private get accountMap(): Record<string, AccountWithoutSecret | undefined> {
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
    return [...this.#getRemovableAccountsWithTokens(), getEnvAccount()].filter(notNullOrUndefined);
  }

  async addAccount(account: Account) {
    assert(this.context);
    const { accountMap } = this;

    if (accountMap[account.id]) {
      log.warn(
        `Account for instance ${account.instanceUrl} and user ${account.username} already exists. The extension ignored the request to re-add it. You can remove the account and add it again.`,
      );
      return;
    }
    const { secret, accountWithoutSecret } = splitAccount(account);
    await this.#storeSecret(account.id, secret);

    await this.context.globalState.update(ACCOUNTS_KEY, {
      ...accountMap,
      [account.id]: accountWithoutSecret,
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

  async #storeSecret(accountId: string, secret: Secret) {
    assert(this.context);
    await this.#validateSecretsAreUpToDate();
    const secrets = { ...this.secrets, [accountId]: secret };
    await this.context.secrets.store(SECRETS_KEY, JSON.stringify(secrets));
    this.secrets = secrets;
  }

  getAccount(accountId: string): Account {
    const result = this.getAllAccounts().find(a => a.id === accountId);
    assert(result, `Account with id ${accountId} doesn't exist.`);
    return result;
  }

  async updateAccountSecret(account: Account) {
    assert(this.context);

    const { secret } = splitAccount(account);
    await this.#storeSecret(account.id, secret);
  }

  async removeAccount(accountId: string) {
    assert(this.context);
    const { accountMap } = this;
    delete accountMap[accountId];

    await this.context.globalState.update(ACCOUNTS_KEY, accountMap);
    await this.#removeToken(accountId);
    this.onDidChangeEmitter.fire();
  }

  getRemovableAccounts(): AccountWithoutSecret[] {
    return Object.values(this.accountMap).filter(notNullOrUndefined);
  }

  #getRemovableAccountsWithTokens(): Account[] {
    const accountsWithMaybeTokens = this.getRemovableAccounts().map(a => ({
      ...a,
      token: undefined,
      ...this.secrets[a.id],
    }));
    accountsWithMaybeTokens
      .filter(a => !a.token)
      .forEach(a =>
        log.error(
          `Account for instance ${a.instanceUrl} and user ${a.username} is missing token in secret storage. Try to remove the account and add it again.`,
        ),
      );
    return accountsWithMaybeTokens.filter((a): a is Account => hasPresentKey('token')(a));
  }
}

export const accountService: AccountService = new AccountService();
