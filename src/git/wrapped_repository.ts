import * as url from 'url';
import { basename } from 'path';
import { Repository } from '../api/git';

import { GITLAB_COM_URL } from '../constants';
import { tokenService } from '../services/token_service';
import { log } from '../log';
import { parseGitRemote } from './git_remote_parser';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';
import { GitLabNewService } from '../gitlab/gitlab_new_service';
import { GitService } from '../git_service';

function intersectionOfInstanceAndTokenUrls(gitRemoteHosts: string[]) {
  const instanceUrls = tokenService.getInstanceUrls();

  return instanceUrls.filter(instanceUrl =>
    gitRemoteHosts.includes(url.parse(instanceUrl).host || ''),
  );
}

function heuristicInstanceUrl(gitRemoteHosts: string[]) {
  // if the intersection of git remotes and configured PATs exists and is exactly
  // one hostname, use it
  const intersection = intersectionOfInstanceAndTokenUrls(gitRemoteHosts);
  if (intersection.length === 1) {
    const heuristicUrl = intersection[0];
    log(`Found ${heuristicUrl} in the PAT list and git remotes, using it as the instanceUrl`);
    return heuristicUrl;
  }

  if (intersection.length > 1) {
    log(`Found more than one intersection of git remotes and configured PATs, ${intersection}`);
  }

  return null;
}

export function getInstanceUrlFromRemotes(gitRemoteUrls: string[]): string {
  const { instanceUrl } = getExtensionConfiguration();
  // if the workspace setting exists, use it
  if (instanceUrl) {
    return instanceUrl;
  }

  // try to determine the instance URL heuristically
  const gitRemoteHosts = gitRemoteUrls
    .map((uri: string) => parseGitRemote(uri)?.host)
    .filter((h): h is string => Boolean(h));
  const heuristicUrl = heuristicInstanceUrl(gitRemoteHosts);
  if (heuristicUrl) {
    return heuristicUrl;
  }

  // default to Gitlab cloud
  return GITLAB_COM_URL;
}

export class WrappedRepository {
  private readonly rawRepository: Repository;

  constructor(rawRepository: Repository) {
    this.rawRepository = rawRepository;
  }

  get instanceUrl(): string {
    const remoteUrls = this.rawRepository.state.remotes
      .map(r => r.fetchUrl)
      .filter((r): r is string => Boolean(r));
    return getInstanceUrlFromRemotes(remoteUrls);
  }

  get gitLabService(): GitLabNewService {
    return new GitLabNewService(this.instanceUrl);
  }

  get gitService(): GitService {
    const { remoteName } = getExtensionConfiguration();
    return new GitService({
      repositoryRoot: this.rootFsPath,
      preferredRemoteName: remoteName,
    });
  }

  get name(): string {
    return basename(this.rawRepository.rootUri.fsPath);
  }

  get rootFsPath(): string {
    return this.rawRepository.rootUri.fsPath;
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
