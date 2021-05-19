import * as url from 'url';
import { basename, join } from 'path';
import * as assert from 'assert';
import { Repository } from '../api/git';

import { GITLAB_COM_URL } from '../constants';
import { tokenService } from '../services/token_service';
import { log } from '../log';
import { GitRemote, parseGitRemote } from './git_remote_parser';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';
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

export class WrappedRepository {
  private readonly rawRepository: Repository;

  private cachedProject?: GitLabProject;

  constructor(rawRepository: Repository) {
    this.rawRepository = rawRepository;
  }

  private get remoteName(): string {
    const preferredRemote = getExtensionConfiguration().remoteName;
    const branchRemote = this.rawRepository.state.HEAD?.remote;
    const firstRemote = this.rawRepository.state.remotes[0]?.name;
    return preferredRemote || branchRemote || firstRemote || 'origin';
  }

  getRemoteByName(remoteName: string): GitRemote {
    const remoteUrl = this.rawRepository.state.remotes.find(r => r.name === remoteName)?.fetchUrl;
    assert(remoteUrl, `could not find any URL for git remote with name '${this.remoteName}'`);
    const parsedRemote = parseGitRemote(remoteUrl, this.instanceUrl);
    assert(parsedRemote, `git remote "${remoteUrl}" could not be parsed`);
    return parsedRemote;
  }

  async getProject(): Promise<GitLabProject | undefined> {
    if (!this.cachedProject) {
      const { namespace, project } = this.remote;
      this.cachedProject = await this.gitLabService.getProject(`${namespace}/${project}`);
    }
    return this.cachedProject;
  }

  get containsGitLabProject(): boolean {
    return Boolean(this.cachedProject);
  }

  get remote(): GitRemote {
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

  get gitLabService(): GitLabNewService {
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
}
