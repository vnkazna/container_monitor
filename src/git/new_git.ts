import assert from 'assert';
import { Remote, Repository } from '../api/git';

type NonEmptyArray<T> = [T, ...T[]];
export type RemoteUrlType = 'fetch' | 'push' | 'both';

export interface GitRemoteUrlEntry {
  url: string;
  type: RemoteUrlType;
}

export interface GitRemote {
  name: string;
  urls: NonEmptyArray<GitRemoteUrlEntry>;
}

export interface GitRepository {
  rootFsPath: string;
  remotes: GitRemote[];
  // TODO: consider moving this into a separate module so we don't have cyclic dependency between GitRepository and GitRemoteUrlPointer
  remoteUrlPointers: GitRemoteUrlPointer[];
  hasSameRootAs(repository: Repository): boolean;
}

export interface GitRemoteUrlPointer {
  urlEntry: GitRemoteUrlEntry;
  remote: GitRemote;
  repository: GitRepository;
}

const getRemoteUrlEntries = (remote: Remote): NonEmptyArray<GitRemoteUrlEntry> => {
  assert(remote.fetchUrl || remote.pushUrl, `git remote ${remote.name} doesn't have any URLs.`);
  if (remote.fetchUrl === remote.pushUrl) {
    return [{ url: remote.fetchUrl!, type: 'both' }];
  }
  const urls = [
    { url: remote.fetchUrl, type: 'fetch' },
    { url: remote.pushUrl, type: 'push' },
  ].filter(u => Boolean(u.url));

  return urls as NonEmptyArray<GitRemoteUrlEntry>; // we can do the cast because first assertion in this method makes sure there's at least one URL
};

export class GitRepositoryImpl implements GitRepository {
  #rawRepository: Repository;

  constructor(rawRepository: Repository) {
    this.#rawRepository = rawRepository;
  }

  get rootFsPath() {
    return this.#rawRepository.rootUri.fsPath;
  }

  get remotes() {
    return this.#rawRepository.state.remotes.map(r => ({
      name: r.name,
      urls: getRemoteUrlEntries(r),
    }));
  }

  get remoteUrlPointers() {
    return this.remotes.flatMap(remote =>
      remote.urls.map(urlEntry => ({ repository: this, remote, urlEntry })),
    );
  }

  /**
   * Compares, whether this wrapper contains repository for the
   * same folder as the method argument.
   *
   * The VS Code Git extension can produce more instances of `Repository`
   * interface for the same git folder. We can't simply compare references with `===`.
   */
  hasSameRootAs(repository: Repository): boolean {
    return this.rootFsPath === repository.rootUri.fsPath;
  }
}
