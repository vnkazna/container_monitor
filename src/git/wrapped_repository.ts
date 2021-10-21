import * as url from 'url';
import { basename, join } from 'path';
import assert from 'assert';
import { Repository } from '../api/git';

import { GITLAB_COM_URL } from '../constants';
import { tokenService } from '../services/token_service';
import { log } from '../log';
import { GitRemote, parseGitRemote } from './git_remote_parser';
import { getExtensionConfiguration, getRepositorySettings } from '../utils/extension_configuration';
import { GitLabNewService } from '../gitlab/gitlab_new_service';
import { GitLabProject } from '../gitlab/gitlab_project';

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

function getInstanceUrlFromRemotes(gitRemoteUrls: string[]): string {
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

export interface CachedMr {
  mr: RestMr;
  mrVersion: RestMrVersion;
}

export class WrappedRepository {
  private readonly rawRepository: Repository;

  private cachedProject?: GitLabProject;

  private mrCache: Record<number, CachedMr> = {};

  constructor(rawRepository: Repository) {
    this.rawRepository = rawRepository;
  }

  private get remoteName(): string | undefined {
    if (this.remoteNames.length === 0) {
      log(`Repository ${this.rootFsPath} doesn't have any remotes.`);
      return undefined;
    }
    if (this.remoteNames.length === 1) {
      return this.remoteNames[0];
    }
    const preferred = getRepositorySettings(this.rootFsPath)?.preferredRemoteName;
    if (!preferred) {
      log(`No preferred remote for ${this.rootFsPath}.`);
      return undefined;
    }
    if (!this.remoteNames.includes(preferred)) {
      log(`Saved preferred remote ${preferred} doesn't exist in repository ${this.rootFsPath}`);
      return undefined;
    }

    return preferred;
  }

  get remoteNames(): string[] {
    return this.rawRepository.state.remotes.map(r => r.name);
  }

  async fetch(): Promise<void> {
    await this.rawRepository.fetch();
  }

  async checkout(branchName: string): Promise<void> {
    await this.rawRepository.checkout(branchName);

    assert(
      this.rawRepository.state.HEAD,
      "We can't read repository HEAD. We suspect that your `git head` command fails and we can't continue till it succeeds",
    );

    const currentBranchName = this.rawRepository.state.HEAD.name;
    assert(
      currentBranchName === branchName,
      `The branch name after the checkout (${currentBranchName}) is not the branch that the extension tried to check out (${branchName}). Inspect your repository before making any more changes.`,
    );
  }

  getRemoteByName(remoteName: string): GitRemote {
    const remoteUrl = this.rawRepository.state.remotes.find(r => r.name === remoteName)?.fetchUrl;
    assert(remoteUrl, `could not find any URL for git remote with name '${this.remoteName}'`);
    const parsedRemote = parseGitRemote(remoteUrl, this.instanceUrl);
    assert(parsedRemote, `git remote "${remoteUrl}" could not be parsed`);
    return parsedRemote;
  }

  async getProject(): Promise<GitLabProject | undefined> {
    if (!this.remote) return undefined;
    if (!this.cachedProject) {
      const { namespace, project } = this.remote;
      this.cachedProject = await this.getGitLabService().getProject(`${namespace}/${project}`);
    }
    return this.cachedProject;
  }

  get containsGitLabProject(): boolean {
    return Boolean(this.cachedProject);
  }

  get branch(): string | undefined {
    return this.rawRepository.state.HEAD?.name;
  }

  async reloadMr(mr: RestMr): Promise<CachedMr> {
    const mrVersion = await this.getGitLabService().getMrDiff(mr);
    const cachedMr = {
      mr,
      mrVersion,
    };
    this.mrCache[mr.id] = cachedMr;
    return cachedMr;
  }

  getMr(id: number): CachedMr | undefined {
    return this.mrCache[id];
  }

  get remote(): GitRemote | undefined {
    if (!this.remoteName) return undefined;
    return this.getRemoteByName(this.remoteName);
  }

  get lastCommitSha(): string | undefined {
    return this.rawRepository.state.HEAD?.commit;
  }

  get instanceUrl(): string {
    const remoteUrls = this.rawRepository.state.remotes
      .map(r => r.fetchUrl)
      .filter((r): r is string => Boolean(r));
    return getInstanceUrlFromRemotes(remoteUrls);
  }

  getGitLabService(): GitLabNewService {
    return new GitLabNewService(this.instanceUrl);
  }

  get name(): string {
    return this.cachedProject?.name ?? basename(this.rawRepository.rootUri.fsPath);
  }

  get rootFsPath(): string {
    return this.rawRepository.rootUri.fsPath;
  }

  async getFileContent(path: string, sha: string): Promise<string | null> {
    // even on Windows, the git show command accepts only POSIX paths
    const absolutePath = join(this.rootFsPath, path).replace(/\\/g, '/');
    // null sufficiently signalises that the file has not been found
    // this scenario is going to happen often (for open and squashed MRs)
    return this.rawRepository.show(sha, absolutePath).catch(() => null);
  }

  async diff(): Promise<string> {
    return this.rawRepository.diff();
  }

  async apply(patchPath: string): Promise<void> {
    return this.rawRepository.apply(patchPath);
  }

  async getTrackingBranchName(): Promise<string> {
    const branchName = this.rawRepository.state.HEAD?.name;
    assert(
      branchName,
      'The repository seems to be in a detached HEAD state. Please checkout a branch.',
    );
    const trackingBranch = await this.rawRepository
      .getConfig(`branch.${branchName}.merge`)
      .catch(() => ''); // the tracking branch is going to be empty most of the time, we'll swallow the error instead of logging it every time

    return trackingBranch.replace('refs/heads/', '') || branchName;
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
