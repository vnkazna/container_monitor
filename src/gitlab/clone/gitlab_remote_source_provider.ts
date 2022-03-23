import assert from 'assert';
import { RemoteSource, RemoteSourceProvider } from '../../api/git';
import { GitLabService } from '../gitlab_service';
import { GitLabProject } from '../gitlab_project';
import { tokenService } from '../../services/token_service';

const SEARCH_LIMIT = 30;
const getProjectQueryAttributes = {
  membership: true,
  limit: SEARCH_LIMIT,
  searchNamespaces: true,
};

export function convertUrlToWikiUrl(url: string): string {
  return url.replace(/\.git$/, '.wiki.git');
}

export type GitLabRemote = RemoteSource & {
  project: GitLabProject;
  url: string[];
  wikiUrl: string[];
};

function remoteForProject(project: GitLabProject): GitLabRemote {
  const url = [project.sshUrlToRepo, project.httpUrlToRepo];

  return {
    name: `$(repo) ${project.fullPath}`,
    description: project.description,
    url,
    wikiUrl: url.map(convertUrlToWikiUrl),
    project,
  };
}

export class GitLabRemoteSourceProvider implements RemoteSourceProvider {
  name: string;

  readonly icon = 'project';

  readonly supportsQuery = true;

  private gitlabService: GitLabService;

  // FIXME: add token to constructor
  constructor(private instanceUrl: string) {
    this.name = `GitLab (${instanceUrl})`;
    const token = tokenService.getToken(instanceUrl);
    assert(token, `There is no token for ${instanceUrl}`);
    this.gitlabService = new GitLabService({ instanceUrl, token });
  }

  async lookupByPath(path: string): Promise<GitLabRemote | undefined> {
    const project = await this.gitlabService.getProject(path);
    if (!project) return undefined;

    return remoteForProject(project);
  }

  async getRemoteSources(query?: string): Promise<GitLabRemote[]> {
    const projects = await this.gitlabService.getProjects({
      search: query,
      ...getProjectQueryAttributes,
    });

    return projects.filter(project => !project.empty).map(project => remoteForProject(project));
  }
}
