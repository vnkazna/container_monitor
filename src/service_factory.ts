import { GitLabService } from './gitlab/gitlab_service';
import { getInstanceUrl } from './utils/get_instance_url';

export async function createGitLabService(repositoryRoot: string): Promise<GitLabService> {
  return new GitLabService(await getInstanceUrl(repositoryRoot));
}
