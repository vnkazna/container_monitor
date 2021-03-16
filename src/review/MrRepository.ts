import * as assert from 'assert';
import { GitLabNewService } from '../gitlab/gitlab_new_service';
import { GitLabProject } from '../gitlab/gitlab_project';
import { GitService } from '../git_service';
import { MrModel } from './MrModel';

export class MrRepository {
  private gitlabService: GitLabNewService;

  private gitService: GitService;

  private project?: GitLabProject;

  private mrs = new Map<number, MrModel>();

  constructor(gitlabService: GitLabNewService, gitService: GitService) {
    this.gitlabService = gitlabService;
    this.gitService = gitService;
  }

  async initialize() {
    const gitRemote = await this.gitService.fetchGitRemote(); // FIXME here we would have to use the config
    this.project = await this.gitlabService.getProject(
      `${gitRemote.namespace}/${gitRemote.project}`,
    );
  }

  getStoredMr(id: number): MrModel | undefined {
    return this.mrs.get(id);
  }

  pupulateMrs(mrs: RestIssuable[]) {
    mrs.forEach(m => {
      assert(this.project);
      this.mrs.set(m.id, new MrModel(m, this.gitlabService, this.project));
    });
  }
}
