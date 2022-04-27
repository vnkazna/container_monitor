import assert from 'assert';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { createRemoteUrlPointers } from '../git/new_git';
import { GitLabRepository } from '../git/wrapped_repository';
import { ProjectInRepository } from '../gitlab/new_project';
import { tokenService } from '../services/token_service';

export const convertRepositoryToProject = async (
  gitlabRepository: GitLabRepository,
): Promise<ProjectInRepository> => {
  const project = await gitlabRepository.getProject();
  const [repository] = gitExtensionWrapper.gitRepositories.filter(
    gr => gr.rootFsPath === gitlabRepository.rootFsPath,
  );
  assert(repository, `Git Repository for ${gitlabRepository.rootFsPath} not found.`);
  const pointers = createRemoteUrlPointers(repository);
  const { namespaceWithPath } = gitlabRepository.remote;
  const [pointer] = pointers.filter(p => p.urlEntry.url.includes(namespaceWithPath));
  assert(pointer, `Cannot find git remote that includes ${namespaceWithPath} project.`);
  const { instanceUrl } = gitlabRepository;
  const [credentials] = tokenService.getAllCredentials().filter(c => c.instanceUrl === instanceUrl);
  assert(credentials, `Missing credentials for ${instanceUrl}`);
  return {
    project,
    pointer,
    credentials,
  };
};
