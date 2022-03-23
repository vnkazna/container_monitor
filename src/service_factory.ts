import assert from 'assert';
import { GitLabService } from './gitlab/gitlab_service';
import { tokenService } from './services/token_service';
import { getInstanceUrl } from './utils/get_instance_url';

export async function createGitLabService(repositoryRoot: string): Promise<GitLabService> {
  const instanceUrl = await getInstanceUrl(repositoryRoot);
  const token = tokenService.getToken(instanceUrl);
  assert(token, `There is no token for ${instanceUrl}`);
  return new GitLabService({ instanceUrl, token });
}
