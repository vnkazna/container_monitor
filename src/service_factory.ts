import * as assert from 'assert';
import { GitService } from './git_service';
import { GitLabNewService } from './gitlab/gitlab_new_service';
import { getInstanceUrl } from './utils/get_instance_url';
import { getExtensionConfiguration } from './utils/get_extension_configuration';

export function createGitService(repositoryRoot: string): GitService {
  assert(repositoryRoot, 'git service requires repositoryRoot to function');
  const { remoteName } = getExtensionConfiguration();
  return new GitService({
    repositoryRoot,
    preferredRemoteName: remoteName,
  });
}

export async function createGitLabNewService(repositoryRoot: string): Promise<GitLabNewService> {
  return new GitLabNewService(await getInstanceUrl(repositoryRoot));
}
