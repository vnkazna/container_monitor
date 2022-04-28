import { Credentials } from './credentials';

export interface Account extends Credentials {
  username: string;
  id: string;
}
