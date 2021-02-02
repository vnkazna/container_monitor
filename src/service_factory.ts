import * as vscode from 'vscode';
import { GitService } from './git_service';
import { GitLabNewService } from './gitlab/gitlab_new_service';
import { getInstanceUrl } from './utils/get_instance_url';

export function createGitService(workspaceFolder: string): GitService {
  const { remoteName, pipelineGitRemoteName } = vscode.workspace.getConfiguration('gitlab');
  // the getConfiguration() returns null for missing attributes, we need to convert them to
  // undefined so that we can use optional properties and default function parameters
  return new GitService({
    workspaceFolder,
    remoteName: remoteName || undefined,
    pipelineGitRemoteName: pipelineGitRemoteName || undefined,
  });
}

export async function createGitLabNewService(workspaceFolder: string): Promise<GitLabNewService> {
  return new GitLabNewService(await getInstanceUrl(workspaceFolder));
}
