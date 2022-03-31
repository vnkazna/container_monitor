import { gitExtensionWrapper } from './git_extension_wrapper';
import { WrappedGitLabProject, WrappedRepository } from './wrapped_repository';

export interface GitLabProjectRepository {
  getWrappedProject(repository: WrappedRepository): Promise<WrappedGitLabProject | undefined>;
  getActiveProject(): Promise<WrappedGitLabProject | undefined>;
}

const getWrappedProject = async (repository: WrappedRepository) => {
  if (!repository.containsGitLabProject) return undefined;
  return repository as unknown as WrappedGitLabProject;
};

export const gitlabProjectRepository: GitLabProjectRepository = {
  getWrappedProject,
  getActiveProject: async () => {
    const repository = gitExtensionWrapper.getActiveRepository();
    if (!repository?.containsGitLabProject) return undefined;
    return getWrappedProject(repository);
  },
};
