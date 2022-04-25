import { GitLabService } from './gitlab_service';
import { ProjectInRepository } from './new_project';

export const getGitLabService: (p: ProjectInRepository) => GitLabService = projectInRepository =>
  new GitLabService(projectInRepository.credentials);
