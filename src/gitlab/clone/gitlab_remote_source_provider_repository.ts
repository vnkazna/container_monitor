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
    const urls = tokenService.getInstanceUrls();
    // create provider(s) for the missing url(s)
    urls.forEach(url => {
      if (!this.remoteSourceProviders.has(url)) {
        const provider = new GitLabRemoteSourceProvider(url);
        const disposable = this.gitAPI.registerRemoteSourceProvider(provider);
        this.remoteSourceProviders.set(url, { provider, disposable });
      }
    });
    // delete provider(s) for removed url(s)
    this.remoteSourceProviders.forEach((provider, providerUrl) => {
      if (urls.indexOf(providerUrl) === -1) {
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
