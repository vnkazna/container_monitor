import { ExtensionContext } from 'vscode';
import { log } from '../log';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';
import { removeTrailingSlash } from '../utils/remove_trailing_slash';
import { Account, makeAccountId } from './account';
import { Credentials } from './credentials';
import { getUserForCredentialsOrFail } from './get_user_for_credentials_or_fail';

const TOKENS_KEY = 'glTokens';
const MIGRATED_CREDENTIALS = 'glMigratedCredentials';

export class CredentialsMigrator {
  #context: ExtensionContext;

  #addAccount: (a: Account) => Promise<void>;

  #accountExists: (a: Account) => boolean;

  #getUser: (c: Credentials) => Promise<RestUser>;

  constructor(
    context: ExtensionContext,
    addAccount: (a: Account) => Promise<void>,
    accountExists: (a: Account) => boolean,
    getUser = getUserForCredentialsOrFail,
  ) {
    this.#context = context;
    this.#addAccount = addAccount;
    this.#accountExists = accountExists;
    this.#getUser = getUser;
  }

  get #glTokenMap(): Record<string, string> {
    return this.#context.globalState.get(TOKENS_KEY, {});
  }

  async migrate(): Promise<void> {
    // await this.context.globalState.update(MIGRATED_CREDENTIALS, []);
    const migratedCredentials: string[] = this.#context.globalState.get(MIGRATED_CREDENTIALS, []);
    const allCredentials = Object.entries(this.#glTokenMap).map(([instanceUrl, token]) => ({
      instanceUrl: removeTrailingSlash(instanceUrl),
      token,
    }));
    const unmigratedCredentials = allCredentials.filter(
      c => !migratedCredentials.includes(`${c.instanceUrl}${c.token}`),
    );
    const accounts = await Promise.all(
      unmigratedCredentials.map(async credentials => {
        try {
          const user = await this.#getUser(credentials);
          return {
            id: makeAccountId(credentials.instanceUrl, user.id),
            instanceUrl: credentials.instanceUrl,
            token: credentials.token,
            username: user.username,
          };
        } catch (e) {
          log.error('Failed to migrate credentials', e);
        }
        return undefined;
      }),
    );
    const newAccounts = accounts.filter(notNullOrUndefined).filter(a => !this.#accountExists(a)); // TODO: if the account already exists, this migration will go on forever
    newAccounts.forEach(a => this.#addAccount(a));
    await this.#context.globalState.update(MIGRATED_CREDENTIALS, [
      ...migratedCredentials,
      ...newAccounts.map(a => `${a.instanceUrl}${a.token}`),
    ]);
  }
}
