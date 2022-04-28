import { Account, makeAccountId } from '../services/account';

export const testAccount = (
  instanceUrl = 'https://gitlab.com',
  userId = 1,
  token = 'abc',
): Account => ({
  id: makeAccountId(instanceUrl, userId),
  username: `user${userId}`,
  instanceUrl,
  token,
});
