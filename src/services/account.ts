import { Credentials } from './credentials';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const makeAccountId = (instanceUrl: string, userId: string | number) =>
  `${instanceUrl}|${userId}`;

export interface Account extends Credentials {
  username: string;
  id: string;
}
