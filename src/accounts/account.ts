import { Credentials } from './credentials';

export const makeAccountId = (instanceUrl: string, userId: string | number) =>
  `${instanceUrl}|${userId}`;

export const needsRefresh = (account: Account) => {
  if (account.type === 'token') return false;
  const unixTimestampNow = Math.floor(new Date().getTime() / 1000);
  return account.expiresAtTimestampInSeconds - 7170 <= unixTimestampNow; // FIXME: remove the 7170
};

interface AccountBase extends Credentials {
  username: string;
  id: string;
}
export interface TokenAccount extends AccountBase {
  type: 'token';
}

export interface OAuthAccount extends AccountBase {
  type: 'oauth';
  scopes: string[];
  refreshToken: string;
  codeVerifier: string; // TODO: try without
  expiresAtTimestampInSeconds: number;
}

export type Account = TokenAccount | OAuthAccount;
