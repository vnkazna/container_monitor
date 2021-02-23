import { RemoteSource, RemoteSourceProvider } from '../../api/git';
import { GitLabNewService } from '../gitlab_new_service';

const SEARCH_LIMIT = 30;

export class GitLabRemoteSourceProvider implements RemoteSourceProvider {
  name: string;

  readonly icon = 'project';

  readonly supportsQuery = true;

  private gitlabService: GitLabNewService;

  constructor(private url: string) {
    this.name = `GitLab (${url})`;
    this.gitlabService = new GitLabNewService(this.url);
  }

  async getRemoteSources(query?: string): Promise<RemoteSource[] | undefined> {
    const projects = await this.gitlabService.getProjects({
      search: query,
      membership: true,
      limit: SEARCH_LIMIT,
      searchNamespaces: true,
    });

    return projects?.map(project => ({
      name: `$(repo) ${project.fullPath}`,
      description: project.description,
      url: [project.sshUrlToRepo, project.httpUrlToRepo],
    }));
  }
}
