import * as vscode from 'vscode';
import * as request from 'request-promise';
import { basename } from 'path';
import { tokenService } from './services/token_service';
import { UserFriendlyError } from './errors/user_friendly_error';
import { ApiError } from './errors/api_error';
import { getCurrentWorkspaceFolder } from './services/workspace_service';
import { createGitLabNewService, createGitService } from './service_factory';
import { GitRemote } from './git/git_remote_parser';
import { handleError, logError } from './log';
import { getUserAgentHeader } from './utils/get_user_agent_header';
import { CustomQueryType } from './gitlab/custom_query_type';
import { CustomQuery } from './gitlab/custom_query';
import { ensureAbsoluteAvatarUrl } from './utils/ensure_absolute_avatar_url';
import { getHttpAgentOptions } from './utils/get_http_agent_options';
import { getInstanceUrl as getInstanceUrlUtil } from './utils/get_instance_url';
import { GitLabProject } from './gitlab/gitlab_project';
import { getExtensionConfiguration } from './utils/get_extension_configuration';

export interface RestJob {
  name: string;
  // eslint-disable-next-line camelcase
  created_at: string;
  status: string;
}

const normalizeAvatarUrl = (instanceUrl: string) => (issuable: RestIssuable): RestIssuable => {
  const { author } = issuable;
  if (!author.avatar_url) {
    return issuable;
  }
  return {
    ...issuable,
    author: {
      ...author,
      avatar_url: ensureAbsoluteAvatarUrl(instanceUrl, author.avatar_url),
    },
  };
};

const projectCache: Record<string, GitLabProject> = {};
let versionCache: string | null = null;

const getInstanceUrl = async () => getInstanceUrlUtil(await getCurrentWorkspaceFolder());

async function fetch(path: string, method = 'GET', data?: Record<string, unknown>) {
  const instanceUrl = await getInstanceUrl();
  const apiRoot = `${instanceUrl}/api/v4`;
  const glToken = tokenService.getToken(instanceUrl);
  const tokens = tokenService.getInstanceUrls().join(', ');

  if (!glToken) {
    let err = `
      GitLab Workflow: Cannot make request.
      GitLab URL for this workspace is set to ${instanceUrl}
      and there is no matching token for this URL.
    `;

    if (tokens.length) {
      err = `${err} You have configured tokens for ${tokens}.`;
    }

    vscode.window.showInformationMessage(err);
    throw new Error(err);
  }

  const config: request.RequestPromiseOptions = {
    method,
    headers: {
      'PRIVATE-TOKEN': glToken,
      ...getUserAgentHeader(),
    },
    ...getHttpAgentOptions(),
  };

  if (data) {
    config.formData = data;
  }

  config.transform = (body, response) => {
    try {
      return {
        response: JSON.parse(body),
        headers: response.headers,
      };
    } catch (e) {
      handleError(
        new UserFriendlyError(
          'Failed to parse GitLab API response',
          e,
          `Response body: ${body}\nRequest URL: ${apiRoot}${path}`,
        ),
      );
      return { error: e };
    }
  };

  return await request(`${apiRoot}${path}`, config);
}

async function fetchProjectData(remote: GitRemote | null, workspaceFolder: string) {
  // TODO require remote so we can guarantee that we return a value or error
  if (remote) {
    if (!(`${remote.namespace}_${remote.project}` in projectCache)) {
      const { namespace, project } = remote;
      const gitlabNewService = await createGitLabNewService(workspaceFolder);
      const projectData = await gitlabNewService.getProject(`${namespace}/${project}`);
      if (projectData) {
        projectCache[`${remote.namespace}_${remote.project}`] = projectData;
      }
    }
    return projectCache[`${remote.namespace}_${remote.project}`] || null;
  }

  return null;
}

export async function fetchCurrentProject(workspaceFolder: string): Promise<GitLabProject | null> {
  try {
    const remote = await createGitService(workspaceFolder).fetchGitRemote();

    return await fetchProjectData(remote, workspaceFolder);
  } catch (e) {
    throw new ApiError(e, 'get current project');
  }
}

export async function fetchCurrentProjectSwallowError(workspaceFolder: string) {
  try {
    return await fetchCurrentProject(workspaceFolder);
  } catch (error) {
    logError(error);
    return null;
  }
}

export async function fetchCurrentPipelineProject(workspaceFolder: string) {
  try {
    const { pipelineGitRemoteName } = getExtensionConfiguration();
    const remote = await createGitService(workspaceFolder).fetchGitRemote(pipelineGitRemoteName);

    return await fetchProjectData(remote, workspaceFolder);
  } catch (e) {
    logError(e);
    return null;
  }
}

export async function fetchCurrentUser() {
  try {
    const { response: user } = await fetch('/user');
    return user;
  } catch (e) {
    throw new ApiError(e, 'get current user');
  }
}

async function fetchFirstUserByUsername(userName: string) {
  try {
    const { response: users } = await fetch(`/users?username=${userName}`);
    return users[0];
  } catch (e) {
    handleError(new UserFriendlyError('Error when fetching GitLab user.', e));
    return undefined;
  }
}

export async function fetchVersion() {
  try {
    if (!versionCache) {
      const { response } = await fetch('/version');
      versionCache = response.version;
    }
  } catch (e) {
    logError(e);
  }

  return versionCache;
}

export async function getAllGitlabWorkspaces(): Promise<GitLabWorkspace[]> {
  if (!vscode.workspace.workspaceFolders) {
    return [];
  }
  const projectsWithUri = vscode.workspace.workspaceFolders.map(async workspaceFolder => {
    const uri = workspaceFolder.uri.fsPath;
    try {
      const currentProject = await fetchCurrentProject(uri);
      return {
        label: currentProject?.name ?? basename(uri),
        uri,
      };
    } catch (e) {
      logError(e);
      return { label: basename(uri), uri, error: true };
    }
  });

  return Promise.all(projectsWithUri);
}

async function fetchLastPipelineForCurrentBranch(
  workspaceFolder: string,
): Promise<RestPipeline | null> {
  const project = await fetchCurrentPipelineProject(workspaceFolder);
  if (!project) {
    return null;
  }

  const branchName = await createGitService(workspaceFolder).fetchTrackingBranchName();
  const pipelinesRootPath = `/projects/${project.restId}/pipelines`;
  const { response: pipelines } = await fetch(`${pipelinesRootPath}?ref=${branchName}`);
  return pipelines.length > 0 ? pipelines[0] : null;
}

type QueryValue = string | boolean | string[] | number | undefined;

export async function fetchIssuables(params: CustomQuery, workspaceFolder: string) {
  const { type, scope, state, author, assignee, wip } = params;
  let { searchIn, pipelineId } = params;
  const config = {
    type: type || 'merge_requests',
    scope: scope || 'all',
    state: state || 'opened',
  };
  let issuable = null;

  const version = await fetchVersion();

  const project = await fetchCurrentProjectSwallowError(workspaceFolder);
  if (!version || !project) return [];

  if (config.type === 'vulnerabilities' && config.scope !== 'dismissed') {
    config.scope = 'all';
  } else if (
    (config.type === 'issues' || config.type === 'merge_requests') &&
    config.scope !== 'assigned_to_me' &&
    config.scope !== 'created_by_me'
  ) {
    config.scope = 'all';
  }

  // Normalize scope parameter for version < 11 instances.
  const [major] = version.split('.');
  if (parseInt(major, 10) < 11) {
    config.scope = config.scope.replace(/_/g, '-');
  }

  let path = '';
  const search = new URLSearchParams();
  search.append('state', config.state);

  /**
   * Set path based on config.type
   */
  if (config.type === 'epics') {
    if (project.groupRestId) {
      path = `/groups/${project.groupRestId}/${config.type}`;
      search.append('include_ancestor_groups', 'true');
    } else {
      return [];
    }
  } else {
    const searchKind =
      config.type === CustomQueryType.VULNERABILITY ? 'vulnerability_findings' : config.type;
    path = `/projects/${project.restId}/${searchKind}`;
    search.append('scope', config.scope);
  }

  /**
   * Author parameters
   */
  if (config.type === 'issues') {
    if (author) {
      search.append('author_username', author);
    }
  } else if (author) {
    const authorUser = await fetchFirstUserByUsername(author);
    search.append('author_id', (authorUser && authorUser.id) || '-1');
  }

  /**
   * Assignee parameters
   */
  if (assignee === 'Any' || assignee === 'None') {
    search.append('assignee_id', assignee);
  } else if (assignee && config.type === 'issues') {
    search.append('assignee_username', assignee);
  } else if (assignee) {
    const assigneeUser = await fetchFirstUserByUsername(assignee);
    search.append('assignee_id', (assigneeUser && assigneeUser.id) || '-1');
  }

  /**
   * Search in parameters
   */
  if (searchIn) {
    if (searchIn === 'all') {
      searchIn = 'title,description';
    }
    search.append('in', searchIn);
  }

  /**
   * Handle WIP/Draft for merge_request config.type
   */
  if (config.type === 'merge_requests' && wip) {
    search.append('wip', wip);
  }

  /**
   * Query parameters related to issues
   */
  let issueQueryParams: Record<string, QueryValue> = {};
  if (config.type === 'issues') {
    issueQueryParams = {
      confidential: params.confidential,
      'not[labels]': params.excludeLabels,
      'not[milestone]': params.excludeMilestone,
      'not[author_username]': params.excludeAuthor,
      'not[assignee_username]': params.excludeAssignee,
      'not[search]': params.excludeSearch,
      'not[in]': params.excludeSearchIn,
    };
  }

  /**
   * Pipeline parameters
   */
  // FIXME: this 'branch' or actual numerical ID most likely doesn't make sense from user perspective
  //        Also, the logic allows for `pipeline_id=branch` query which doesn't make sense
  //        Issue to deprecate this filter: https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/311
  if (pipelineId) {
    if (pipelineId === 'branch') {
      const workspace = await getCurrentWorkspaceFolder();
      if (workspace) {
        pipelineId = (await fetchLastPipelineForCurrentBranch(workspace))?.id;
      }
    }
    search.append('pipeline_id', `${pipelineId}`);
  }

  /**
   * Miscellaneous parameters
   */
  const queryParams: Record<string, QueryValue> = {
    labels: params.labels,
    milestone: params.milestone,
    search: params.search,
    created_before: params.createdBefore,
    created_after: params.createdAfter,
    updated_before: params.updatedBefore,
    updated_after: params.updatedAfter,
    order_by: params.orderBy,
    sort: params.sort,
    per_page: params.maxResults,
    report_type: params.reportTypes,
    severity: params.severityLevels,
    confidence: params.confidenceLevels,
    ...issueQueryParams,
  };
  const usedQueryParamNames = Object.keys(queryParams).filter(k => queryParams[k]);
  usedQueryParamNames.forEach(name => search.append(name, `${queryParams[name]}`));

  const { response } = await fetch(`${path}?${search.toString()}`);
  issuable = response;
  return issuable.map(normalizeAvatarUrl(await getInstanceUrl()));
}

export async function fetchLastJobsForCurrentBranch(pipeline: RestPipeline): Promise<RestJob[]> {
  const { response } = await fetch(
    `/projects/${pipeline.project_id}/pipelines/${pipeline.id}/jobs`,
  );
  let jobs: RestJob[] = response;

  // Gitlab return multiple jobs if you retry the pipeline we filter to keep only the last
  const alreadyProcessedJob = new Set();
  jobs = jobs.sort((one, two) => (one.created_at > two.created_at ? -1 : 1));
  jobs = jobs.filter(job => {
    if (alreadyProcessedJob.has(job.name)) {
      return false;
    }
    alreadyProcessedJob.add(job.name);
    return true;
  });

  return jobs;
}

export async function fetchOpenMergeRequestForCurrentBranch(
  workspaceFolder: string,
): Promise<RestIssuable | null> {
  const project = await fetchCurrentProject(workspaceFolder);
  const branchName = await createGitService(workspaceFolder).fetchTrackingBranchName();

  const path = `/projects/${project?.restId}/merge_requests?state=opened&source_branch=${branchName}`;
  const { response } = await fetch(path);
  const mrs = response;

  if (mrs.length > 0) {
    return mrs[0];
  }

  return null;
}

export async function fetchLastPipelineForMr(mr: RestIssuable): Promise<RestPipeline | null> {
  const path = `/projects/${mr.project_id}/merge_requests/${mr.iid}/pipelines`;
  const { response: pipelines } = await fetch(path);
  return pipelines.length > 0 ? pipelines[0] : null;
}

export async function fetchPipelineAndMrForCurrentBranch(
  workspaceFolder: string,
): Promise<{
  pipeline: RestPipeline | null;
  mr: RestIssuable | null;
}> {
  // TODO: implement more granular approach to errors (deciding between expected and critical)
  // This can be done when we migrate the code to gitlab_new_service.ts
  const turnErrorToNull: <T>(p: Promise<T>) => Promise<T | null> = p =>
    p.catch(e => {
      logError(e);
      return null;
    });

  const mr = await turnErrorToNull(fetchOpenMergeRequestForCurrentBranch(workspaceFolder));
  if (mr) {
    const pipeline = await turnErrorToNull(fetchLastPipelineForMr(mr));
    if (pipeline) return { mr, pipeline };
  }
  const pipeline = await turnErrorToNull(fetchLastPipelineForCurrentBranch(workspaceFolder));
  return { mr, pipeline };
}

/**
 * Cancels or retries last pipeline or creates a new pipeline for current branch.
 *
 * @param {string} action create|retry|cancel
 */
export async function handlePipelineAction(action: string, workspaceFolder: string) {
  const { pipeline } = await fetchPipelineAndMrForCurrentBranch(workspaceFolder);
  const project = await fetchCurrentProjectSwallowError(workspaceFolder);

  if (pipeline && project) {
    let endpoint = `/projects/${project.restId}/pipelines/${pipeline.id}/${action}`;

    if (action === 'create') {
      const branchName = await createGitService(workspaceFolder).fetchTrackingBranchName();
      endpoint = `/projects/${project.restId}/pipeline?ref=${branchName}`;
    }

    try {
      const { response } = await fetch(endpoint, 'POST');
      return response;
    } catch (e) {
      throw new UserFriendlyError(`Failed to ${action} pipeline.`, e);
    }
  } else {
    vscode.window.showErrorMessage('GitLab Workflow: No project or pipeline found.');
    return undefined;
  }
}

export async function fetchMRIssues(
  mrId: number,
  workspaceFolder: string,
): Promise<RestIssuable[]> {
  const project = await fetchCurrentProjectSwallowError(workspaceFolder);
  let issues = [];

  if (project) {
    try {
      const { response } = await fetch(
        `/projects/${project.restId}/merge_requests/${mrId}/closes_issues`,
      );
      issues = response;
    } catch (e) {
      logError(e);
    }
  }

  return issues;
}

// TODO specify the correct interface when we convert `create_snippet.js`
export async function createSnippet(data: { id: string }) {
  let snippet;
  let path = '/snippets';

  if (data.id) {
    path = `/projects/${data.id}/snippets`;
  }

  try {
    const { response } = await fetch(path, 'POST', data);
    snippet = response;
  } catch (e) {
    handleError(new UserFriendlyError('Failed to create your snippet.', e));
  }

  return snippet;
}

export async function validateCIConfig(content: string) {
  let validCIConfig = null;

  try {
    const { response } = await fetch('/ci/lint', 'POST', { content });
    validCIConfig = response;
  } catch (e) {
    handleError(new UserFriendlyError('Failed to validate CI configuration.', e));
  }

  return validCIConfig;
}
interface Discussion {
  notes: {
    // eslint-disable-next-line camelcase
    created_at: string;
  }[];
}

export async function renderMarkdown(markdown: string, workspaceFolder: string) {
  let rendered = { html: markdown };
  const version = await fetchVersion();
  if (!version) {
    return markdown;
  }
  const [major] = version.split('.');

  if (parseInt(major, 10) < 11) {
    return markdown;
  }

  try {
    const project = await fetchCurrentProject(workspaceFolder);
    const { response } = await fetch('/markdown', 'POST', {
      text: markdown,
      project: project?.fullPath,
      gfm: 'true', // Needs to be a string for the API
    });
    rendered = response;
  } catch (e) {
    logError(e);
    return markdown;
  }

  return rendered.html;
}
