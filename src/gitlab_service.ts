import * as vscode from 'vscode';
import * as request from 'request-promise';
import * as fs from 'fs';
import { tokenService } from './services/token_service';
import { UserFriendlyError } from './errors/user_friendly_error';
import { ApiError } from './errors/api_error';
import { getCurrentWorkspaceFolder } from './services/workspace_service';
import { createGitService } from './git_service_factory';
import { GitRemote } from './git/git_remote_parser';
import { handleError, logError } from './log';
import { getUserAgentHeader } from './utils/get_user_agent_header';
import { CustomQueryType } from './gitlab/custom_query_type';
import { CustomQuery } from './gitlab/custom_query';

interface GitLabProject {
  id: number;
  name: string;
  namespace: {
    id: number;
    kind: string;
  };
  // eslint-disable-next-line camelcase
  path_with_namespace: string;
}

interface GitLabPipeline {
  id: number;
}

interface GitLabJob {
  name: string;
  // eslint-disable-next-line camelcase
  created_at: string;
}

const projectCache: Record<string, GitLabProject> = {};
let versionCache: string | null = null;

async function fetch(path: string, method = 'GET', data?: Record<string, unknown>) {
  const { ignoreCertificateErrors, ca, cert, certKey } = vscode.workspace.getConfiguration(
    'gitlab',
  );
  const instanceUrl = await createGitService(
    // fetching of instanceUrl is the only GitService method that doesn't need workspaceFolder
    // TODO: remove this default value once we implement https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/260
    (await getCurrentWorkspaceFolder()) || '',
  ).fetchCurrentInstanceUrl();
  const { proxy } = vscode.workspace.getConfiguration('http');
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
    rejectUnauthorized: !ignoreCertificateErrors,
  };

  if (proxy) {
    config.proxy = proxy;
  }

  if (ca) {
    try {
      config.ca = fs.readFileSync(ca);
    } catch (e) {
      handleError(new UserFriendlyError(`Cannot read CA '${ca}'`, e));
    }
  }

  if (cert) {
    try {
      config.cert = fs.readFileSync(cert);
    } catch (e) {
      handleError(new UserFriendlyError(`Cannot read CA '${cert}'`, e));
    }
  }

  if (certKey) {
    try {
      config.key = fs.readFileSync(certKey);
    } catch (e) {
      handleError(new UserFriendlyError(`Cannot read CA '${certKey}'`, e));
    }
  }

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
        new UserFriendlyError('Failed to parse GitLab API response', e, `Response body: ${body}`),
      );
      return { error: e };
    }
  };

  return await request(`${apiRoot}${path}`, config);
}

async function fetchProjectData(remote: GitRemote | null) {
  if (remote) {
    if (!(`${remote.namespace}_${remote.project}` in projectCache)) {
      const { namespace, project } = remote;
      const { response } = await fetch(`/projects/${namespace.replace(/\//g, '%2F')}%2F${project}`);
      const projectData = response;
      projectCache[`${remote.namespace}_${remote.project}`] = projectData;
    }
    return projectCache[`${remote.namespace}_${remote.project}`] || null;
  }

  return null;
}

export async function fetchCurrentProject(workspaceFolder: string): Promise<GitLabProject | null> {
  try {
    const remote = await createGitService(workspaceFolder).fetchGitRemote();

    return await fetchProjectData(remote);
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
    const remote = await createGitService(workspaceFolder).fetchGitRemotePipeline();

    return await fetchProjectData(remote);
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

export async function getAllGitlabProjects() {
  if (!vscode.workspace.workspaceFolders) {
    return [];
  }
  const projectsWithUri = vscode.workspace.workspaceFolders.map(async workspaceFolder => ({
    label: (await fetchCurrentProject(workspaceFolder.uri.fsPath))?.name,
    uri: workspaceFolder.uri.fsPath,
  }));

  const fetchedProjectsWithUri = await Promise.all(projectsWithUri);

  return fetchedProjectsWithUri.filter(p => p.label);
}

export async function fetchLastPipelineForCurrentBranch(workspaceFolder: string) {
  const project = await fetchCurrentPipelineProject(workspaceFolder);
  let pipeline = null;

  if (project) {
    const branchName = await createGitService(workspaceFolder).fetchTrackingBranchName();
    const pipelinesRootPath = `/projects/${project.id}/pipelines`;
    const { response } = await fetch(`${pipelinesRootPath}?ref=${branchName}`);
    const pipelines = response;

    if (pipelines.length) {
      const fetchResult = await fetch(`${pipelinesRootPath}/${pipelines[0].id}`);
      pipeline = fetchResult.response;
    }
  }

  return pipeline;
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
  if (!version) {
    return [];
  }

  const project = await fetchCurrentProjectSwallowError(workspaceFolder);
  if (project) {
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

    if (config.type === 'epics') {
      if (project.namespace.kind === 'group') {
        path = `/groups/${project.namespace.id}/${config.type}?include_ancestor_groups=true&state=${config.state}`;
      } else {
        return [];
      }
    } else {
      const searchKind =
        config.type === CustomQueryType.VULNERABILITY ? 'vulnerability_findings' : config.type;
      path = `/projects/${project.id}/${searchKind}?scope=${config.scope}&state=${config.state}`;
    }
    if (config.type === 'issues') {
      if (author) {
        path = `${path}&author_username=${author}`;
      }
    } else if (author) {
      const authorUser = await fetchFirstUserByUsername(author);
      if (authorUser) {
        path = `${path}&author_id=${authorUser.id}`;
      } else {
        path = `${path}&author_id=-1`;
      }
    }
    if (assignee === 'Any' || assignee === 'None') {
      path = `${path}&assignee_id=${assignee}`;
    } else if (assignee && config.type === 'issues') {
      path = `${path}&assignee_username=${assignee}`;
    } else if (assignee) {
      const assigneeUser = await fetchFirstUserByUsername(assignee);
      if (assigneeUser) {
        path = `${path}&assignee_id=${assigneeUser.id}`;
      } else {
        path = `${path}&assignee_id=-1`;
      }
    }
    if (searchIn) {
      if (searchIn === 'all') {
        searchIn = 'title,description';
      }
      path = `${path}&in=${searchIn}`;
    }
    if (config.type === 'merge_requests' && wip) {
      path = `${path}&wip=${wip}`;
    }
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
    if (pipelineId) {
      if (pipelineId === 'branch') {
        const workspace = await getCurrentWorkspaceFolder();
        if (workspace) {
          pipelineId = await fetchLastPipelineForCurrentBranch(workspace);
        }
      }
      path = `${path}&pipeline_id=${pipelineId}`;
    }
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
    const urlQuery = usedQueryParamNames.reduce(
      (acc, name) => `${acc}&${name}=${queryParams[name]}`,
      '',
    );
    path = `${path}${urlQuery}`;
    const { response } = await fetch(path);
    issuable = response;
  }
  return issuable;
}

export async function fetchLastJobsForCurrentBranch(
  pipeline: GitLabPipeline,
  workspaceFolder: string,
) {
  const project = await fetchCurrentPipelineProject(workspaceFolder);
  if (project) {
    const { response } = await fetch(`/projects/${project.id}/pipelines/${pipeline.id}/jobs`);
    let jobs: GitLabJob[] = response;

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

  return null;
}

export async function fetchOpenMergeRequestForCurrentBranch(workspaceFolder: string) {
  const project = await fetchCurrentProjectSwallowError(workspaceFolder);
  const branchName = await createGitService(workspaceFolder).fetchTrackingBranchName();

  const path = `/projects/${project?.id}/merge_requests?state=opened&source_branch=${branchName}`;
  const { response } = await fetch(path);
  const mrs = response;

  if (mrs.length > 0) {
    return mrs[0];
  }

  return null;
}

/**
 * Cancels or retries last pipeline or creates a new pipeline for current branch.
 *
 * @param {string} action create|retry|cancel
 */
export async function handlePipelineAction(action: string, workspaceFolder: string) {
  const pipeline = await fetchLastPipelineForCurrentBranch(workspaceFolder);
  const project = await fetchCurrentProjectSwallowError(workspaceFolder);

  if (pipeline && project) {
    let endpoint = `/projects/${project.id}/pipelines/${pipeline.id}/${action}`;

    if (action === 'create') {
      const branchName = await createGitService(workspaceFolder).fetchTrackingBranchName();
      endpoint = `/projects/${project.id}/pipeline?ref=${branchName}`;
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

export async function fetchMRIssues(mrId: number, workspaceFolder: string) {
  const project = await fetchCurrentProjectSwallowError(workspaceFolder);
  let issues = [];

  if (project) {
    try {
      const { response } = await fetch(
        `/projects/${project.id}/merge_requests/${mrId}/closes_issues`,
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

interface LabelEvent {
  label: unknown;
  body: string;
  // eslint-disable-next-line camelcase
  created_at: string;
}

export async function fetchLabelEvents(issuable: RestIssuable): Promise<LabelEvent[]> {
  let labelEvents: LabelEvent[] = [];

  try {
    const type = issuable.sha ? 'merge_requests' : 'issues';
    const { response } = await fetch(
      `/projects/${issuable.project_id}/${type}/${issuable.iid}/resource_label_events?sort=asc&per_page=100`,
    );
    labelEvents = response;
  } catch (e) {
    handleError(new UserFriendlyError('Failed to fetch label events for this issuable.', e));
  }

  labelEvents.forEach(el => {
    // Temporarily disable eslint to be able to start enforcing stricter rules
    // eslint-disable-next-line no-param-reassign
    el.body = '';
  });
  return labelEvents;
}

interface Discussion {
  notes: {
    // eslint-disable-next-line camelcase
    created_at: string;
  }[];
}

export async function fetchDiscussions(issuable: RestIssuable, page = 1): Promise<Discussion[]> {
  let discussions: Discussion[] = [];

  try {
    const type = issuable.sha ? 'merge_requests' : 'issues';
    const { response, headers } = await fetch(
      `/projects/${issuable.project_id}/${type}/${issuable.iid}/discussions?sort=asc&per_page=5&page=${page}`,
    );
    discussions = response;
    if (page === 1 && headers['x-next-page'] !== '') {
      const pages = [];
      // Temporarily disable eslint to be able to start enforcing stricter rules
      // eslint-disable-next-line no-plusplus
      for (let i = 2; i <= headers['x-total-pages']; i++) {
        pages.push(fetchDiscussions(issuable, i));
      }
      const results = await Promise.all(pages);
      results.forEach(result => {
        discussions = discussions.concat(result);
      });
    }
  } catch (e) {
    handleError(new UserFriendlyError('Failed to fetch discussions for this issuable.', e));
  }

  return discussions;
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
      // eslint-disable-next-line camelcase
      project: project?.path_with_namespace,
      gfm: 'true', // Needs to be a string for the API
    });
    rendered = response;
  } catch (e) {
    logError(e);
    return markdown;
  }

  return rendered.html;
}

export async function saveNote(params: {
  issuable: RestIssuable;
  note: string;
  noteType: { path: string };
}) {
  try {
    const projectId = params.issuable.project_id;
    const { iid } = params.issuable;
    const { path } = params.noteType;
    const { response } = await fetch(`/projects/${projectId}/${path}/${iid}/notes`, 'POST', {
      body: params.note,
    });
    return response;
  } catch (e) {
    logError(e);
  }

  return { success: false };
}

type note = Discussion | LabelEvent;

function isLabelEvent(object: any): object is LabelEvent {
  return Boolean(object.label);
}

export async function fetchDiscussionsAndLabelEvents(issuable: RestIssuable): Promise<note[]> {
  const [discussions, labelEvents] = await Promise.all([
    fetchDiscussions(issuable),
    fetchLabelEvents(issuable),
  ]);

  const combinedEvents: note[] = [...discussions, ...labelEvents];
  combinedEvents.sort((a: note, b: note) => {
    const aCreatedAt = isLabelEvent(a) ? a.created_at : a.notes[0].created_at;
    const bCreatedAt = isLabelEvent(b) ? b.created_at : b.notes[0].created_at;
    return aCreatedAt < bCreatedAt ? -1 : 1;
  });

  return combinedEvents;
}
