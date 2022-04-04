import { GitLabService } from '../gitlab/gitlab_service';
import { InitializedProject, ParsedProject } from '../gitlab/new_project';
import { tokenService, TokenService } from '../services/token_service';
import { hasPresentKey } from '../utils/has_present_key';
import { notNullOrUndefined } from '../utils/not_null_or_undefined';
import { uniq } from '../utils/uniq';
import { GitExtensionWrapper, gitExtensionWrapper } from './git_extension_wrapper';
import { parseGitRemote } from './git_remote_parser';

export interface GitLabProjectRepository {
  getAllProjects(): InitializedProject[];
  init(): Promise<void>;
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
    .filter(notNullOrUndefined);

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

  async #updateProjects() {
    const pointers = this.#gitExtensionWrapper.gitRepositories.flatMap(gr => gr.remoteUrlPointers);
    const remoteUrls = uniq(pointers.map(p => p.urlEntry.url));
    const instanceUrls = uniq(this.#tokenService.getAllCredentials().map(c => c.instanceUrl));
    const parsedProjects = parseProjects(remoteUrls, instanceUrls);
    const projectsWithCredentials = parsedProjects.flatMap(pp =>
      this.#tokenService
        .getAllCredentials()
        .filter(cr => cr.instanceUrl === pp.instanceUrl)
        .map(credentials => ({ ...pp, credentials })),
    );
    const loadedProjects = await Promise.all(
      projectsWithCredentials.map(async p => {
        const project = await new GitLabService(p.credentials).getProject(
          `${p.namespace}/${p.projectName}`,
        );
        return { ...p, project };
      }),
    );
    const existingProjects = loadedProjects.filter(hasPresentKey('project'));
    const initializedProjects = existingProjects.flatMap(ep =>
      pointers.filter(p => p.urlEntry.url === ep.remoteUrl).map(pointer => ({ ...ep, pointer })),
    );
    this.#projects = initializedProjects;
  }
}

export const gitLabProjectRepository: GitLabProjectRepository = new GitLabProjectRepositoryImpl();
