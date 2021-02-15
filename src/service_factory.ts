import * as assert from 'assert';
import { GitService } from './git_service';
import { GitLabNewService } from './gitlab/gitlab_new_service';
import { getInstanceUrl } from './utils/get_instance_url';
import { getExtensionConfiguration } from './utils/get_extension_configuration';

export function createGitService(workspaceFolder: string): GitService {
  assert(workspaceFolder, 'git service requires workspaceFolder to function');
  const { remoteName } = getExtensionConfiguration();
  return new GitService({
    workspaceFolder,
    preferredRemoteName: remoteName,
  });
}

export async function createGitLabNewService(workspaceFolder: string): Promise<GitLabNewService> {
  return new GitLabNewService(await getInstanceUrl(workspaceFolder));
}
