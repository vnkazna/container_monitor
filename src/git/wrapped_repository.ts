import * as url from 'url';
import { basename } from 'path';
import assert from 'assert';
import { Repository } from '../api/git';

import { GITLAB_COM_URL } from '../constants';
import { tokenService } from '../services/token_service';
import { log } from '../log';
import { GitLabRemote, parseGitLabRemote } from './git_remote_parser';
import { getExtensionConfiguration, getRepositorySettings } from '../utils/extension_configuration';
import { GitLabService } from '../gitlab/gitlab_service';
import { GitLabProject } from '../gitlab/gitlab_project';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';

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
    log.info(`Found ${heuristicUrl} in the PAT list and git remotes, using it as the instanceUrl`);
    return heuristicUrl;
  }

  if (intersection.length > 1) {
    log.warn(
      `Found more than one intersection of git remotes and configured PATs, ${intersection}. You have to configure which remote to use.`,
    );
  }

  return null;
}

function getInstanceUrlFromRemotes(gitRemoteUrls: string[]): string {
  const { instanceUrl } = getExtensionConfiguration();
  // if the workspace setting exists, use it
  if (instanceUrl) {
    return instanceUrl;
  }

  // try to determine the instance URL heuristically
  const gitRemoteHosts = gitRemoteUrls
    .map((uri: string) => parseGitLabRemote(uri)?.host)
    .filter(notNullOrUndefined);
  const heuristicUrl = heuristicInstanceUrl(gitRemoteHosts);
  if (heuristicUrl) {
    return heuristicUrl;
  }

  // default to Gitlab cloud
  return GITLAB_COM_URL;
}

export interface WrappedRepository {
  remoteNames: string[];
  containsGitLabProject: boolean;
  branch?: string;
  remote?: GitLabRemote;
  instanceUrl: string;
  name: string;
  rootFsPath: string;
  getRemoteByName(remoteName: string): GitLabRemote;
  getProject(): Promise<GitLabProject | undefined>;
  getPipelineProject(): Promise<GitLabProject | undefined>;

  getGitLabService(): GitLabService;
  hasSameRootAs(repository: Repository): boolean;
  getVersion(): Promise<string | undefined>;
}

export type GitLabRepository = Omit<WrappedRepository, 'getProject'> & {
  remote: GitLabRemote;
  getProject: () => Promise<GitLabProject>;
};

export class WrappedRepositoryImpl implements WrappedRepository {
  private readonly rawRepository: Repository;

  private cachedProject?: GitLabProject;

  constructor(rawRepository: Repository) {
    this.rawRepository = rawRepository;
  }

  private get remoteName(): string | undefined {
    if (this.remoteNames.length === 0) {
      log.warn(`Repository ${this.rootFsPath} doesn't have any remotes.`);
      return undefined;
    }
    if (this.remoteNames.length === 1) {
      return this.remoteNames[0];
    }
    const preferred = getRepositorySettings(this.rootFsPath)?.preferredRemoteName;
    if (!preferred) {
      log.warn(`No preferred remote for ${this.rootFsPath}.`);
      return undefined;
    }
    if (!this.remoteNames.includes(preferred)) {
      log.warn(
        `Saved preferred remote ${preferred} doesn't exist in repository ${this.rootFsPath}`,
      );
      return undefined;
    }

    return preferred;
  }

  get remoteNames(): string[] {
    return this.rawRepository.state.remotes.map(r => r.name);
  }

  getRemoteByName(remoteName: string): GitLabRemote {
    const remoteUrl = this.rawRepository.state.remotes.find(r => r.name === remoteName)?.fetchUrl;
    assert(remoteUrl, `could not find any URL for git remote with name '${remoteName}'`);
    const parsedRemote = parseGitLabRemote(remoteUrl, this.instanceUrl);
    assert(parsedRemote, `git remote "${remoteUrl}" could not be parsed`);
    return parsedRemote;
  }

  async getProject(): Promise<GitLabProject | undefined> {
    if (!this.remote) return undefined;
    if (
      !this.cachedProject ||
      this.cachedProject.namespaceWithPath !== this.remote.namespaceWithPath // mainly for tests, scenario where the preferred remote changes
    ) {
      this.cachedProject = await this.getGitLabService().getProject(this.remote.namespaceWithPath);
    }
    return this.cachedProject;
  }

  async getPipelineProject(): Promise<GitLabProject | undefined> {
    const { pipelineGitRemoteName } = getExtensionConfiguration();
    if (!pipelineGitRemoteName) return this.getProject();
    const { namespaceWithPath } = this.getRemoteByName(pipelineGitRemoteName);
    return this.getGitLabService().getProject(namespaceWithPath);
  }

  get containsGitLabProject(): boolean {
    return Boolean(this.cachedProject);
  }

  get branch(): string | undefined {
    return this.rawRepository.state.HEAD?.name;
  }

  get remote(): GitLabRemote | undefined {
    if (!this.remoteName) return undefined;
    return this.getRemoteByName(this.remoteName);
  }

  get instanceUrl(): string {
    const remoteUrls = this.rawRepository.state.remotes
      .map(r => r.fetchUrl)
      .filter(notNullOrUndefined);
    return getInstanceUrlFromRemotes(remoteUrls);
  }

  getGitLabService(): GitLabService {
    const token = tokenService.getToken(this.instanceUrl);
    assert(token, `There is no token for ${this.instanceUrl}`);
    return new GitLabService({ instanceUrl: this.instanceUrl, token });
  }

  get name(): string {
    return this.cachedProject?.name ?? basename(this.rawRepository.rootUri.fsPath);
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

  getVersion(): Promise<string | undefined> {
    return this.getGitLabService().getVersion();
  }
}
