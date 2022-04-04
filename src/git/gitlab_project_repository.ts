import { InitializedProject, ParsedProject } from '../gitlab/new_project';
import { tokenService, TokenService } from '../services/token_service';
import { uniq } from '../utils/uniq';
import { GitExtensionWrapper, gitExtensionWrapper } from './git_extension_wrapper';
import { parseGitRemote } from './git_remote_parser';
import { GitRemoteUrlPointer, GitRepository } from './new_git';

export interface GitLabProjectRepository {
  // getWrappedProject(repository: WrappedRepository): Promise<WrappedGitLabProject | undefined>;
  // getActiveProject(): Promise<WrappedGitLabProject | undefined>;
  getAllProjects(): InitializedProject[];
}

const createParsedProject = (remoteUrl: string, instanceUrl: string): ParsedProject | undefined => {
  const remote = parseGitRemote(remoteUrl, instanceUrl);
  return (
    remote && {
      remoteUrl,
      instanceUrl,
      projectName: remote.project,
      namespace: remote.namespace,
    }
  );
};

const parseProjects = (remoteUrls: string[], instanceUrls: string[]): ParsedProject[] =>
  remoteUrls
    .flatMap(remoteUrl => {
      const { host } = parseGitRemote(remoteUrl) || {};
      const matchingInstanceUrls = instanceUrls.filter(
        instanceUrl => new URL(instanceUrl).host === host,
      );
      return matchingInstanceUrls.map(instanceUrl => createParsedProject(remoteUrl, instanceUrl));
    })
    .filter((p): p is ParsedProject => Boolean(p));

const createProject = async (
  pointer: GitRemoteUrlPointer,
  tokenService: TokenService,
): Promise<InitializedProject | undefined> => {};
export class GitLabProjectRepositoryImpl implements GitLabProjectRepository {
  #tokenService: TokenService;

  #gitExtensionWrapper: GitExtensionWrapper;

  #projects: InitializedProject = [];

  constructor(ts = tokenService, gew = gitExtensionWrapper) {
    this.#tokenService = ts;
    this.#gitExtensionWrapper = gew;
  }

  async init(): Promise<void> {
    tokenService.onDidChange(this.#updateProjects, this);
    gitExtensionWrapper.onRepositoryCountChanged(this.#updateProjects, this);
  }

  async #updateProjects() {
    const pointers = gitExtensionWrapper.gitRepositories.flatMap(gr => gr.remoteUrlPointers);
    const remoteUrls = uniq(pointers.map(p => p.urlEntry.url));
    const instanceUrls = uniq(tokenService.getAllCredentials().map(c => c.instanceUrl));
    const parsedProjects = parseProjects(remoteUrls, instanceUrls);
  }
}

export const gitLabProjectRepository: GitLabProjectRepository = new GitLabProjectRepositoryImpl();
