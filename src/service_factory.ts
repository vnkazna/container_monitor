import { GitLabNewService } from './gitlab/gitlab_new_service';
import { getInstanceUrl } from './utils/get_instance_url';

export async function createGitLabNewService(repositoryRoot: string): Promise<GitLabNewService> {
  return new GitLabNewService(await getInstanceUrl(repositoryRoot));
}
