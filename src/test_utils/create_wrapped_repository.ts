import { WrappedRepository } from '../git/wrapped_repository';
import { GitLabNewService } from '../gitlab/gitlab_new_service';
import {
  createFakeRepository,
  fakeRepositoryOptions,
  FakeRepositoryOptions,
} from './fake_git_extension';

export interface CreateWrappedRepositoryOptions extends FakeRepositoryOptions {
  gitLabService: Partial<GitLabNewService>;
}

const defaultOptions = {
  ...fakeRepositoryOptions,
  gitLabService: {},
};

export const createWrappedRepository = (
  options: Partial<CreateWrappedRepositoryOptions> = {},
): WrappedRepository => {
  const repository = new WrappedRepository(createFakeRepository({ ...defaultOptions, ...options }));
  if (options.gitLabService) {
    repository.getGitLabService = () => options.gitLabService as any;
  }
  return repository;
};
