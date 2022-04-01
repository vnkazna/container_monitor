import { GitRemoteUrlPointer } from '../git/new_git';
import { GitLabProject } from './gitlab_project';

export interface ProjectWrapper {
  pointer: GitRemoteUrlPointer;
  instanceUrl: string;
  project: GitLabProject;
}

export interface UserProvidedProjectBinding {
  remoteUrl: string;
  namespace: string;
  projectName: string;
}
