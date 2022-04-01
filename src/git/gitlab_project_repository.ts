import assert from 'assert';
import { ProjectWrapper } from '../gitlab/new_project';
import { tokenService, TokenService } from '../services/token_service';
import { GitExtensionWrapper, gitExtensionWrapper } from './git_extension_wrapper';
import { parseGitRemote } from './git_remote_parser';
import { GitRemoteUrlPointer, GitRepository } from './new_git';

export interface GitLabProjectRepository {
  // getWrappedProject(repository: WrappedRepository): Promise<WrappedGitLabProject | undefined>;
  // getActiveProject(): Promise<WrappedGitLabProject | undefined>;
  getAllProjects(): ProjectWrapper[];
}

const createProject = async (pointer: GitRemoteUrlPointer, tokenService: TokenService): Promise<ProjectWrapper | undefined> => {
   const {host} = parseGitRemote(pointer.urlEntry.url) || {}
   const matchingInstanceUrls  = tokenService.getInstanceUrls().filter(url => new URL(url).host === host)
   if(matchingInstanceUrls.length === 0) return undefined;
   if(matchingInstanceUrls.length > 1) throw new Error(`Remote ${pointer.urlEntry.url} is matched by multiple instanceUrls, this is not supported.`);
   const [instanceUrl] = matchingInstanceUrls;
   const parsedRemote = parseGitRemote(pointer.urlEntry.url, instanceUrl);
   assert(parsedRemote);
   const {project, namespace} = parsedRemote;

}
export class GitLabProjectRepositoryImpl implements GitLabProjectRepository {
  #tokenService: TokenService;

  #gitExtensionWrapper: GitExtensionWrapper;

  #projects: ProjectWrapper = [];


  constructor(ts = tokenService, gew = gitExtensionWrapper) {
    this.#tokenService = ts;
    this.#gitExtensionWrapper = gew;
  }

  async init(): Promise<void> {
    tokenService.onDidChange(this.#updateProjects, this);
    gitExtensionWrapper.onRepositoryCountChanged(this.#updateProjects, this);
  }

  async #updateProjects() {
    this.#projects = gitExtensionWrapper.gitRepositories.flatMap(gr => gr.remoteUrlPointers).map(pointer => )
  }
}

export const gitLabProjectRepository: GitLabProjectRepository = new GitLabProjectRepositoryImpl();
