import { Uri } from 'vscode';
import { Credentials, CredentialsProvider } from '../../api/git';
import { tokenService } from '../../services/token_service';

export const gitlabCredentialsProvider: CredentialsProvider = {
  async getCredentials(host: Uri): Promise<Credentials | undefined> {
    const matchingInstance = tokenService.getInstanceUrls().find(url => {
      const instanceURI = Uri.parse(url);
      return host.scheme === instanceURI.scheme && host.authority === instanceURI.authority;
    });
    if (matchingInstance) {
      const token = tokenService.getToken(matchingInstance);
      if (token) {
        return {
          username: 'arbitrary_username_ignored_by_gitlab',
          password: token,
        };
      }
    }

    return undefined;
  },
};
