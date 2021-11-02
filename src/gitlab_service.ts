import * as vscode from 'vscode';
import request from 'request-promise';
import { tokenService } from './services/token_service';
import { UserFriendlyError } from './errors/user_friendly_error';
import { ApiError } from './errors/api_error';
import { handleError, logError } from './log';
import { getUserAgentHeader } from './utils/get_user_agent_header';
import { CustomQueryType } from './gitlab/custom_query_type';
import { CustomQuery } from './gitlab/custom_query';
import { ensureAbsoluteAvatarUrl } from './utils/ensure_absolute_avatar_url';
import { getHttpAgentOptions } from './utils/get_http_agent_options';
import { getInstanceUrl } from './utils/get_instance_url';
import { GitLabProject } from './gitlab/gitlab_project';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { getExtensionConfiguration } from './utils/extension_configuration';
import { README_SECTIONS } from './constants';
import { HelpError } from './errors/help_error';

const normalizeAvatarUrl =
  (instanceUrl: string) =>
  (issuable: RestIssuable): RestIssuable => {
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

let versionCache: string | null = null;

async function fetch(
  repositoryRoot: string,
  path: string,
  method = 'GET',
  data?: Record<string, unknown>,
) {
  const instanceUrl = await getInstanceUrl(repositoryRoot);
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

    throw new HelpError(err, { section: README_SECTIONS.SETUP });
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

  return request(`${apiRoot}${path}`, config);
}

async function fetchCurrentProject(repositoryRoot: string): Promise<GitLabProject | null> {
  try {
    const repository = gitExtensionWrapper.getRepository(repositoryRoot);
    return (await repository.getProject()) ?? null;
  } catch (e) {
    throw new ApiError(e, 'get current project');
  }
}

async function fetchCurrentProjectSwallowError(
  repositoryRoot: string,
): Promise<GitLabProject | null> {
  try {
    return await fetchCurrentProject(repositoryRoot);
  } catch (error) {
    logError(error);
    return null;
  }
}

export async function fetchCurrentPipelineProject(
  repositoryRoot: string,
): Promise<GitLabProject | null> {
  try {
    const repository = gitExtensionWrapper.getRepository(repositoryRoot);
    const { pipelineGitRemoteName } = getExtensionConfiguration();
    if (pipelineGitRemoteName) {
      const { namespace, project } = repository.getRemoteByName(pipelineGitRemoteName);
      return (await repository.getGitLabService().getProject(`${namespace}/${project}`)) ?? null;
    }
    return (await repository.getProject()) ?? null;
  } catch (e) {
    logError(e);
    return null;
  }
}

export async function fetchCurrentUser(repositoryRoot: string): Promise<RestUser> {
  try {
    const { response: user } = await fetch(repositoryRoot, '/user');
    if (!user) throw new Error('Could not retrieve current user.');
    return user;
  } catch (e) {
    throw new ApiError(e, 'get current user');
  }
}

async function fetchFirstUserByUsername(repositoryRoot: string, userName: string) {
  try {
    const { response: users } = await fetch(repositoryRoot, `/users?username=${userName}`);
    return users[0];
  } catch (e) {
    handleError(new UserFriendlyError('Error when fetching GitLab user.', e));
    return undefined;
  }
}

export async function fetchVersion(repositoryRoot: string) {
  try {
    if (!versionCache) {
      const { response } = await fetch(repositoryRoot, '/version');
      versionCache = response.version;
    }
  } catch (e) {
    handleError(e);
  }

  return versionCache;
}

async function fetchLastPipelineForCurrentBranch(
  repositoryRoot: string,
): Promise<RestPipeline | undefined> {
  const project = await fetchCurrentPipelineProject(repositoryRoot);
  if (!project) {
    return undefined;
  }

  const branchName = await gitExtensionWrapper
    .getRepository(repositoryRoot)
    .getTrackingBranchName();
  const pipelinesRootPath = `/projects/${project.restId}/pipelines`;
  const { response: pipelines } = await fetch(
    repositoryRoot,
    `${pipelinesRootPath}?ref=${encodeURIComponent(branchName)}`,
  );
  return pipelines.length > 0 ? pipelines[0] : null;
}

type QueryValue = string | boolean | string[] | number | undefined;

export async function fetchIssuables(params: CustomQuery, repositoryRoot: string) {
  const { type, scope, state, author, assignee, wip } = params;
  let { searchIn, pipelineId, reviewer } = params;
  const config = {
    type: type || 'merge_requests',
    scope: scope || 'all',
    state: state || 'opened',
  };
  let issuable = null;

  const version = await fetchVersion(repositoryRoot);

  const project = await fetchCurrentProjectSwallowError(repositoryRoot);
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
    const authorUser = await fetchFirstUserByUsername(repositoryRoot, author);
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
    const assigneeUser = await fetchFirstUserByUsername(repositoryRoot, assignee);
    search.append('assignee_id', (assigneeUser && assigneeUser.id) || '-1');
  }

  /**
   * Reviewer parameters
   */
  if (reviewer) {
    if (reviewer === '<current_user>') {
      const user = await fetchCurrentUser(repositoryRoot);
      reviewer = user.username;
    }
    search.append('reviewer_username', reviewer);
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
      pipelineId = (await fetchLastPipelineForCurrentBranch(repositoryRoot))?.id;
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

  const { response } = await fetch(repositoryRoot, `${path}?${search.toString()}`);
  issuable = response;
  return issuable.map(normalizeAvatarUrl(await getInstanceUrl(repositoryRoot)));
}

export async function fetchJobsForPipeline(
  repositoryRoot: string,
  pipeline: RestPipeline,
): Promise<RestJob[]> {
  const { response } = await fetch(
    repositoryRoot,
    `/projects/${pipeline.project_id}/pipelines/${pipeline.id}/jobs`,
  );
  return response;
}

export async function fetchOpenMergeRequestForCurrentBranch(
  repositoryRoot: string,
): Promise<RestMr | undefined> {
  const project = await fetchCurrentProject(repositoryRoot);
  const branchName = await gitExtensionWrapper
    .getRepository(repositoryRoot)
    .getTrackingBranchName();

  const path = `/projects/${
    project?.restId
  }/merge_requests?state=opened&source_branch=${encodeURIComponent(branchName)}`;
  const { response } = await fetch(repositoryRoot, path);
  const mrs = response;

  if (mrs.length > 0) {
    return mrs[0];
  }

  return undefined;
}

export async function fetchLastPipelineForMr(
  repositoryRoot: string,
  mr: RestMr,
): Promise<RestPipeline | undefined> {
  const path = `/projects/${mr.project_id}/merge_requests/${mr.iid}/pipelines`;
  const { response: pipelines } = await fetch(repositoryRoot, path);
  return pipelines[0];
}

export async function fetchPipelineAndMrForCurrentBranch(repositoryRoot: string): Promise<{
  pipeline?: RestPipeline;
  mr?: RestMr;
}> {
  // TODO: implement more granular approach to errors (deciding between expected and critical)
  // This can be done when we migrate the code to gitlab_new_service.ts
  const turnErrorToUndefined: <T>(p: Promise<T>) => Promise<T | undefined> = p =>
    p.catch(e => {
      logError(e);
      return undefined;
    });

  const mr = await turnErrorToUndefined(fetchOpenMergeRequestForCurrentBranch(repositoryRoot));
  if (mr) {
    const pipeline = await turnErrorToUndefined(fetchLastPipelineForMr(repositoryRoot, mr));
    if (pipeline) return { mr, pipeline };
  }
  const pipeline = await turnErrorToUndefined(fetchLastPipelineForCurrentBranch(repositoryRoot));
  return { mr, pipeline };
}

/**
 * Cancels or retries last pipeline or creates a new pipeline for current branch.
 *
 * @param {string} action create|retry|cancel
 */
export async function handlePipelineAction(action: string, repositoryRoot: string) {
  const { pipeline } = await fetchPipelineAndMrForCurrentBranch(repositoryRoot);
  const project = await fetchCurrentProjectSwallowError(repositoryRoot);

  if (pipeline && project) {
    let endpoint = `/projects/${project.restId}/pipelines/${pipeline.id}/${action}`;

    if (action === 'create') {
      const branchName = await gitExtensionWrapper
        .getRepository(repositoryRoot)
        .getTrackingBranchName();
      endpoint = `/projects/${project.restId}/pipeline?ref=${encodeURIComponent(branchName)}`;
    }

    try {
      const { response } = await fetch(repositoryRoot, endpoint, 'POST');
      return response;
    } catch (e) {
      throw new UserFriendlyError(`Failed to ${action} pipeline.`, e);
    }
  } else {
    await vscode.window.showErrorMessage('GitLab Workflow: No project or pipeline found.');
    return undefined;
  }
}

export async function fetchMRIssues(mrId: number, repositoryRoot: string): Promise<RestIssuable[]> {
  const project = await fetchCurrentProjectSwallowError(repositoryRoot);
  let issues = [];

  if (project) {
    try {
      const { response } = await fetch(
        repositoryRoot,
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
export async function createSnippet(repositoryRoot: string, data: { id: number }) {
  try {
    const { response } = await fetch(repositoryRoot, `/projects/${data.id}/snippets`, 'POST', data);
    return response;
  } catch (e) {
    throw new UserFriendlyError('Failed to create your snippet.', e);
  }
}

export async function renderMarkdown(markdown: string, repositoryRoot: string) {
  let rendered = { html: markdown };
  const version = await fetchVersion(repositoryRoot);
  if (!version) {
    return markdown;
  }
  const [major] = version.split('.');

  if (parseInt(major, 10) < 11) {
    return markdown;
  }

  try {
    const project = await fetchCurrentProject(repositoryRoot);
    const { response } = await fetch(repositoryRoot, '/markdown', 'POST', {
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
