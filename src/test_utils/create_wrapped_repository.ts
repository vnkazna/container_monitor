import { WrappedRepository, WrappedRepositoryImpl } from '../git/wrapped_repository';
import { GitLabService } from '../gitlab/gitlab_service';
import {
  createFakeRepository,
  fakeRepositoryOptions,
  FakeRepositoryOptions,
} from './fake_git_extension';

export interface CreateWrappedRepositoryOptions extends FakeRepositoryOptions {
  gitLabService: Partial<GitLabService>;
}

const defaultOptions = {
  ...fakeRepositoryOptions,
  gitLabService: {},
};

export const createWrappedRepository = (
  options: Partial<CreateWrappedRepositoryOptions> = {},
): WrappedRepository => {
  const repository = new WrappedRepositoryImpl(
    createFakeRepository({ ...defaultOptions, ...options }),
  );
  if (options.gitLabService) {
    repository.getGitLabService = () => options.gitLabService as any;
  }
  return repository;
};
