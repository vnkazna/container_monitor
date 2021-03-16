import { GitLabNewService } from '../gitlab/gitlab_new_service';
import { GitLabProject } from '../gitlab/gitlab_project';

export class MrModel {
  readonly mr: RestIssuable;

  gitlabService: GitLabNewService;

  project: GitLabProject;

  version?: RestMrVersion;

  constructor(mr: RestIssuable, gitlabService: GitLabNewService, project: GitLabProject) {
    this.mr = mr;
    this.gitlabService = gitlabService;
    this.project = project;
  }

  async getVersion(): Promise<RestMrVersion> {
    if (this.version) return this.version;
    this.version = await this.gitlabService.getMrDiff(this.mr);
    return this.version;
  }
}
