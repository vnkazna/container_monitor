import { GitRemoteUrlPointer } from '../git/new_git';
import { Credentials } from '../services/token_service';
import { GitLabProject } from './gitlab_project';

/**
 * Existing project represents a remote URL for which we were
 * able to fetch GitLab project from the GitLab instance using
 * a concrete set of credentials. (Different credentials will fetch
 * different ExistingProjects)
 */
export interface ExistingProject {
  remoteUrl: string;
  project: GitLabProject;
  credentials: Credentials;
}

/**
 * Initialized project is ExistingProject that we associate with a concrete
 * local Git repository and local Git remote (including URL). This relationship
 * is defined by the pointer.
 */
export interface InitializedProject {
  pointer: GitRemoteUrlPointer;
  credentials: Credentials;
  project: GitLabProject;
}
