import { Credentials } from '../services/token_service';

export const testCredentials = (instanceUrl = 'https://gitlab.example.com'): Credentials => ({
  instanceUrl,
  token: 'token',
});
