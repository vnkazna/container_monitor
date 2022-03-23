import { Disposable } from 'vscode';
import { API } from '../../api/git';
import { tokenService } from '../../services/token_service';
import { GitLabRemoteSourceProvider } from './gitlab_remote_source_provider';

/**
 * This class manages the creation and deletion of RemoteSourceProviders for the git.clone command for each configured instance url
 */
export class GitLabRemoteSourceProviderRepository implements Disposable {
  remoteSourceProviders = new Map<
    string,
    { provider: GitLabRemoteSourceProvider; disposable: Disposable }
  >();

  private tokenServiceListener: Disposable;

  constructor(private gitAPI: API) {
    this.update();
    this.tokenServiceListener = tokenService.onDidChange(this.update, this);
  }

  update(): void {
    const credentials = tokenService.getAllCredentials();
    // create provider(s) for the missing url(s)
    credentials.forEach(c => {
      if (!this.remoteSourceProviders.has(c.instanceUrl)) {
        const provider = new GitLabRemoteSourceProvider(c);
        const disposable = this.gitAPI.registerRemoteSourceProvider(provider);
        this.remoteSourceProviders.set(c.instanceUrl, { provider, disposable });
      }
    });
    // delete provider(s) for removed url(s)
    const instanceUrls = credentials.map(c => c.instanceUrl);
    this.remoteSourceProviders.forEach((provider, providerUrl) => {
      if (instanceUrls.indexOf(providerUrl) === -1) {
        this.remoteSourceProviders.delete(providerUrl);
        provider.disposable.dispose();
      }
    });
  }

  dispose(): void {
    this.remoteSourceProviders.forEach(({ disposable }) => disposable?.dispose());
    this.remoteSourceProviders.clear();
    this.tokenServiceListener.dispose();
  }
}
