import { RemoteSource, RemoteSourceProvider } from '../../api/git';
import { GitLabNewService } from '../gitlab_new_service';

const SEARCH_LIMIT = 30;
const getProjectQueryAttributes = {
  membership: true,
  limit: SEARCH_LIMIT,
  searchNamespaces: true,
};

export function convertUrlToWikiUrl(url: string): string {
  return url.replace(/\.git$/, '.wiki.git');
}

export class GitLabRemoteSourceProvider implements RemoteSourceProvider {
  name: string;

  readonly icon = 'project';

  readonly supportsQuery = true;

  private gitlabService: GitLabNewService;

  constructor(private url: string) {
    this.name = `GitLab (${url})`;
    this.gitlabService = new GitLabNewService(this.url);
  }

  async getRemoteSources(query?: string): Promise<RemoteSource[]> {
    const projects = await this.gitlabService.getProjects({
      search: query,
      ...getProjectQueryAttributes,
    });

    return projects.map(project => ({
      name: `$(repo) ${project.fullPath}`,
      description: project.description,
      url: [project.sshUrlToRepo, project.httpUrlToRepo],
    }));
  }

  async getRemoteWikiSources(query?: string): Promise<RemoteSource[]> {
    const projects = await this.gitlabService.getProjects({
      search: query,
      ...getProjectQueryAttributes,
    });

    const wikiprojects = projects.filter(project => project.wikiEnabled);
    return wikiprojects.map(project => {
      return {
        name: `$(repo) ${project.fullPath}`,
        description: project.description,
        url: [
          convertUrlToWikiUrl(project.sshUrlToRepo),
          convertUrlToWikiUrl(project.httpUrlToRepo),
        ],
      };
    });
  }
}
