import { Account } from '../services/account';

export const testAccount = (
  instanceUrl = 'https://gitlab.com',
  userId = 1,
  token = 'abc',
): Account => ({
  id: `${instanceUrl}-${userId}`,
  username: `user${userId}`,
  instanceUrl,
  token,
});
