import { GitLabService } from './gitlab_service';
import { ExistingProject, ProjectInRepository, SelectedProjectSetting } from './new_project';
import { Credentials, tokenService, TokenService } from '../services/token_service';
import { cartesianProduct } from '../utils/cartesian_product';
import { hasPresentKey } from '../utils/has_present_key';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';
import { uniq } from '../utils/uniq';
import { GitExtensionWrapper, gitExtensionWrapper } from '../git/git_extension_wrapper';
import { parseGitLabRemote } from '../git/git_remote_parser';
import { createRemoteUrlPointers, GitRemoteUrlPointer } from '../git/new_git';
import { groupBy } from '../utils/group_by';
import {
  convertProjectToSetting,
  SelectedProjectStore,
  selectedProjectStore,
} from './selected_project_store';
import { isEqual } from '../utils/is_equal';

interface ParsedProject {
  namespaceWithPath: string;
  remoteUrl: string;
  instanceUrl: string;
}

export interface GitLabProjectRepository {
  getAllProjects(): ProjectInRepository[];
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

const detectProjects = async (
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

const assignProjectsToRepositories = async (
  pointers: GitRemoteUrlPointer[],
  existingProjects: ExistingProject[],
) => {
  const pointersByRemoteUrl = groupBy(pointers, p => p.urlEntry.url);
  return existingProjects.flatMap(ep =>
    pointersByRemoteUrl[ep.remoteUrl].map(pointer => ({
      ...ep,
      pointer,
    })),
  );
};

const addSelectedProjects = async (
  selectedProjectSettings: SelectedProjectSetting[],
  detectedProjects: ProjectInRepository[],
): Promise<ProjectInRepository[]> => {
  const settingsByRepository = groupBy(selectedProjectSettings, pc => pc.repositoryRootPath);
  const isSelected = (pr: ProjectInRepository): boolean => {
    const selectedProject = convertProjectToSetting(pr);
    const selectedProjectForRepository =
      settingsByRepository[pr.pointer.repository.rootFsPath] || [];
    return selectedProjectForRepository.some(c => isEqual(c, selectedProject));
  };
  return detectedProjects.map(dp => ({
    ...dp,
    initializationType: isSelected(dp) ? 'selected' : undefined,
  }));
};

export const initializeAllProjects = async (
  allCredentials: Credentials[],
  pointers: GitRemoteUrlPointer[],
  selectedProjectSettings: SelectedProjectSetting[],
  getProject = GitLabService.tryToGetProjectFromInstance,
): Promise<ProjectInRepository[]> => {
  const detectedProjects = await detectProjects(
    uniq(pointers.map(p => p.urlEntry.url)),
    allCredentials,
    getProject,
  );
  const detectedProjectsInRepositories = await assignProjectsToRepositories(
    pointers,
    detectedProjects,
  );
  return addSelectedProjects(selectedProjectSettings, detectedProjectsInRepositories);
};

export class GitLabProjectRepositoryImpl implements GitLabProjectRepository {
  #tokenService: TokenService;

  #gitExtensionWrapper: GitExtensionWrapper;

  #selectedProjectsStore: SelectedProjectStore;

  #projects: ProjectInRepository[] = [];

  constructor(ts = tokenService, gew = gitExtensionWrapper, sps = selectedProjectStore) {
    this.#tokenService = ts;
    this.#gitExtensionWrapper = gew;
    this.#selectedProjectsStore = sps;
  }

  async init(): Promise<void> {
    this.#tokenService.onDidChange(this.#updateProjects, this);
    this.#gitExtensionWrapper.onRepositoryCountChanged(this.#updateProjects, this);
    this.#selectedProjectsStore.onSelectedProjectsChange(this.#updateProjects, this);

    await this.#updateProjects();
  }

  getAllProjects(): ProjectInRepository[] {
    return this.#projects;
  }

  async #updateProjects() {
    const pointers = this.#gitExtensionWrapper.gitRepositories.flatMap(createRemoteUrlPointers);
    this.#projects = await initializeAllProjects(
      this.#tokenService.getAllCredentials(),
      pointers,
      this.#selectedProjectsStore.selectedProjectSettings,
    );
  }
}

export const gitlabProjectRepository: GitLabProjectRepository = new GitLabProjectRepositoryImpl();
