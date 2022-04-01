import { GitRemoteUrlEntry } from '../git/new_git';
import { GitLabProject } from './gitlab_project';

export interface ProjectWrapper {
  remoteUrlEntry: GitRemoteUrlEntry;
  instanceUrl: string;
  project: GitLabProject;
}

export interface UserProvidedProjectBinding {
  remoteUrl: string;
  groupName: string;
  projectName: string;
}
