import { GitRemoteUrlPointer } from '../git/new_git';
import { Credentials } from '../services/token_service';
import { GitLabProject } from './gitlab_project';

export interface ParsedProject {
  remoteUrl: string;
  projectName: string;
  namespace: string;
  instanceUrl: string;
}

export interface SelectedProject {
  projectName: string;
  namespace: string;
  pointer: GitRemoteUrlPointer;
  credentials: Credentials;
}

export interface InitializedProject {
  projectName: string;
  namespace: string;
  pointer: GitRemoteUrlPointer;
  credentials: Credentials;
  project: GitLabProject;
}

export interface SelectedProjectSetting {
  namespace: string;
  projectName: string;
  repositoryRootPath: string;
  remoteName: string;
  accountId: string;
}
