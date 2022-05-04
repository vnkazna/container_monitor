import { Credentials } from '../services/credentials';

export const testCredentials = (instanceUrl = 'https://gitlab.example.com'): Credentials => ({
  instanceUrl,
  token: 'token',
});
