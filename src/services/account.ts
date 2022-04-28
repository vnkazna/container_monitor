import { Credentials } from './credentials';

export const makeAccountId = (instanceUrl: string, userId: string | number) =>
  `${instanceUrl}-${userId}`;
export interface Account extends Credentials {
  username: string;
  id: string;
}
