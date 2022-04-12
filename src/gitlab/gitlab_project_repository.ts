import { GitLabService } from './gitlab_service';
import { ExistingProject, InitializedProject } from './new_project';
import { Credentials, tokenService, TokenService } from '../services/token_service';
import { cartesianProduct } from '../utils/cartesian_product';
import { hasPresentKey } from '../utils/has_present_key';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';
import { uniq } from '../utils/uniq';
import { GitExtensionWrapper, gitExtensionWrapper } from '../git/git_extension_wrapper';
import { parseGitLabRemote } from '../git/git_remote_parser';
import { createRemoteUrlPointers } from '../git/new_git';
import { groupBy } from '../utils/group_by';

interface ParsedProject {
  namespaceWithPath: string;
  remoteUrl: string;
  instanceUrl: string;
}

export interface GitLabProjectRepository {
  getAllProjects(): InitializedProject[];
  detectProjects(): Promise<InitializedProject[]>;
  init(): Promise<void>;
}

const parseProject = (remoteUrl: string, instanceUrl: string): ParsedProject | undefined => {
  const { host } = parseGitLabRemote(remoteUrl) || {};
  if (new URL(instanceUrl).host !== host) return undefined;
  const remote = parseGitLabRemote(remoteUrl, instanceUrl);
  return remote && { remoteUrl, instanceUrl, ...remote };
};

const parseProjects = (remoteUrls: string[], instanceUrls: string[]): ParsedProject[] =>
  cartesianProduct(remoteUrls, instanceUrls) // all possible combinations of remoteUrl and instanceUrl
    .map(([remoteUrl, instanceUrl]) => parseProject(remoteUrl, instanceUrl))
    .filter(notNullOrUndefined);

export const detectProjects = async (
  remoteUrls: string[],
  allCredentials: Credentials[],
  getProject = GitLabService.tryToGetProjectFromInstance,
): Promise<ExistingProject[]> => {
  const uniqRemoteUrls = uniq(remoteUrls);
  const credentialsForInstance = groupBy(allCredentials, i => i.instanceUrl);
  const instanceUrls = Object.keys(credentialsForInstance);
  const parsedProjects = parseProjects(uniqRemoteUrls, instanceUrls);
  const projectsWithCredentials = parsedProjects.flatMap(pp =>
    credentialsForInstance[pp.instanceUrl].map(credentials => ({ ...pp, credentials })),
  );
  const loadedProjects = await Promise.all(
    projectsWithCredentials.map(async p => {
      const project = await getProject(p.credentials, p.namespaceWithPath);
      return { ...p, project };
    }),
  );
  return loadedProjects.filter(hasPresentKey('project'));
};

export class GitLabProjectRepositoryImpl implements GitLabProjectRepository {
  #tokenService: TokenService;

  #gitExtensionWrapper: GitExtensionWrapper;

  #projects: InitializedProject[] = [];

  constructor(ts = tokenService, gew = gitExtensionWrapper) {
    this.#tokenService = ts;
    this.#gitExtensionWrapper = gew;
  }

  async init(): Promise<void> {
    tokenService.onDidChange(this.#updateProjects, this);
    gitExtensionWrapper.onRepositoryCountChanged(this.#updateProjects, this);
    await this.#updateProjects();
  }

  getAllProjects(): InitializedProject[] {
    return this.#projects;
  }

  async detectProjects() {
    const pointers = this.#gitExtensionWrapper.gitRepositories.flatMap(createRemoteUrlPointers);
    const pointersByRemoteUrl = groupBy(pointers, p => p.urlEntry.url);
    const existingProjects = await detectProjects(
      Object.keys(pointersByRemoteUrl),
      this.#tokenService.getAllCredentials(),
    );
    return existingProjects.flatMap(ep =>
      pointersByRemoteUrl[ep.remoteUrl].map(pointer => ({ ...ep, pointer })),
    );
  }

  async #updateProjects() {
    this.#projects = await this.detectProjects();
  }
}

export const gitLabProjectRepository: GitLabProjectRepository = new GitLabProjectRepositoryImpl();
