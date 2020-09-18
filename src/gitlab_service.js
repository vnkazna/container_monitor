const vscode = require('vscode');
const request = require('request-promise');
const fs = require('fs');
const GitService = require('./git_service');
const tokenService = require('./token_service');
const statusBar = require('./status_bar');
const gitlabProjectInput = require('./gitlab_project_input');
const { ApiError, UserFriendlyError } = require('./errors');

const projectCache = [];
let versionCache = null;

const createGitService = workspaceFolder => {
  const { instanceUrl, remoteName, pipelineGitRemoteName } = vscode.workspace.getConfiguration(
    'gitlab',
  );
  return new GitService(
    workspaceFolder,
    instanceUrl,
    remoteName,
    pipelineGitRemoteName,
    tokenService,
    vscode.gitLabWorkflow.log,
  );
};

async function getCurrentWorkspaceFolder() {
  const editor = vscode.window.activeTextEditor;

  if (
    editor &&
    editor.document &&
    vscode.workspace.getWorkspaceFolder(editor.document.uri) !== undefined
  ) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri).uri.fsPath;
    return workspaceFolder;
  }

  if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length === 1) {
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }

  return null;
}

async function getCurrentWorkspaceFolderOrSelectOne() {
  let workspaceFolder = null;

  workspaceFolder = await getCurrentWorkspaceFolder();

  if (workspaceFolder == null) {
    workspaceFolder = await gitlabProjectInput.show();
  }

  return workspaceFolder;
}

async function fetch(path, method = 'GET', data = null) {
  const { ignoreCertificateErrors, ca, cert, certKey } = vscode.workspace.getConfiguration(
    'gitlab',
  );
  const instanceUrl = await createGitService(
    await getCurrentWorkspaceFolderOrSelectOne(),
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

  const config = {
    url: `${apiRoot}${path}`,
    method,
    headers: {
      'PRIVATE-TOKEN': glToken,
    },
    ecdhCurve: 'auto',
    rejectUnauthorized: !ignoreCertificateErrors,
  };

  if (proxy) {
    config.proxy = proxy;
  }

  if (ca) {
    try {
      config.ca = fs.readFileSync(ca);
    } catch (e) {
      vscode.gitLabWorkflow.handleError(new UserFriendlyError(`Cannot read CA '${ca}'`, e));
    }
  }

  if (cert) {
    try {
      config.cert = fs.readFileSync(cert);
    } catch (e) {
      vscode.gitLabWorkflow.handleError(new UserFriendlyError(`Cannot read CA '${cert}'`, e));
    }
  }

  if (certKey) {
    try {
      config.key = fs.readFileSync(certKey);
    } catch (e) {
      vscode.gitLabWorkflow.handleError(new UserFriendlyError(`Cannot read CA '${certKey}'`, e));
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
      vscode.gitLabWorkflow.handleError(
        new UserFriendlyError('Failed to parse GitLab API response', e, `Response body: ${body}`),
      );
      return { error: e };
    }
  };

  return await request(config);
}

async function fetchProjectData(remote) {
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

async function fetchCurrentProject(workspaceFolder) {
  try {
    const remote = await createGitService(workspaceFolder).fetchGitRemote();

    return await fetchProjectData(remote);
  } catch (e) {
    throw new ApiError(e, 'get current project');
  }
}

async function fetchCurrentProjectSwallowError(workspaceFolder) {
  try {
    return await fetchCurrentProject(workspaceFolder);
  } catch (error) {
    vscode.gitLabWorkflow.logError(error);
    return null;
  }
}

async function fetchCurrentPipelineProject(workspaceFolder) {
  try {
    const remote = await createGitService(workspaceFolder).fetchGitRemotePipeline();

    return await fetchProjectData(remote);
  } catch (e) {
    vscode.gitLabWorkflow.logError(e);
    return null;
  }
}

async function fetchCurrentUser() {
  try {
    const { response: user } = await fetch('/user');
    return user;
  } catch (e) {
    throw new ApiError(e, 'get current user');
  }
}

async function fetchFirstUserByUsername(userName) {
  try {
    const { response: users } = await fetch(`/users?username=${userName}`);
    return users[0];
  } catch (e) {
    vscode.gitLabWorkflow.handleError(new UserFriendlyError('Error when fetching GitLab user.', e));
    return undefined;
  }
}

async function fetchVersion() {
  try {
    if (!versionCache) {
      const { response } = await fetch('/version');
      versionCache = response.version;
    }
  } catch (e) {
    vscode.gitLabWorkflow.logError(e);
  }

  return versionCache;
}

async function getAllGitlabProjects() {
  let workspaceFolders = [];
  if (vscode.workspace.workspaceFolders) {
    workspaceFolders = vscode.workspace.workspaceFolders.map(workspaceFolder => ({
      label: fetchCurrentProject(workspaceFolder.uri.fsPath),
      uri: workspaceFolder.uri.fsPath,
    }));

    const labels = await Promise.all(
      workspaceFolders.map(workspaceFolder => workspaceFolder.label),
    );

    // Temporarily disable eslint to be able to start enforcing stricter rules
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < workspaceFolders.length; i++) {
      if (labels[i] != null) {
        workspaceFolders[i].label = labels[i].name;
      } else {
        workspaceFolders[i].label = null;
      }
    }

    workspaceFolders = workspaceFolders.filter(workspaceFolder => workspaceFolder.label != null);
  }
  return workspaceFolders;
}

async function fetchLastPipelineForCurrentBranch(workspaceFolder) {
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

async function fetchIssuables(params = {}, projectUri) {
  const {
    type,
    maxResults,
    scope,
    state,
    labels,
    milestone,
    author,
    assignee,
    search,
    createdBefore,
    createdAfter,
    updatedBefore,
    updatedAfter,
    wip,
    confidential,
    excludeLabels,
    excludeMilestone,
    excludeAuthor,
    excludeAssignee,
    excludeSearch,
    excludeSearchIn,
    orderBy,
    sort,
    reportTypes,
    severityLevels,
    confidenceLevels,
  } = params;
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

  const project = await fetchCurrentProjectSwallowError(projectUri);
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
    if (config.type === 'vulnerabilities') {
      config.type = 'vulnerability_findings';
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
      path = `/projects/${project.id}/${config.type}?scope=${config.scope}&state=${config.state}`;
    }
    if (labels) {
      path = `${path}&labels=${labels}`;
    }
    if (milestone) {
      path = `${path}&milestone=${milestone}`;
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
    if (search) {
      path = `${path}&search=${search}`;
    }
    if (searchIn) {
      if (searchIn === 'all') {
        searchIn = 'title,description';
      }
      path = `${path}&in=${searchIn}`;
    }
    if (createdBefore) {
      path = `${path}&created_before=${createdBefore}`;
    }
    if (createdAfter) {
      path = `${path}&created_after=${createdAfter}`;
    }
    if (updatedBefore) {
      path = `${path}&updated_before=${updatedBefore}`;
    }
    if (updatedAfter) {
      path = `${path}&updated_after=${updatedAfter}`;
    }
    if (config.type === 'merge_requests' && wip) {
      path = `${path}&wip=${wip}`;
    }
    if (config.type === 'issues') {
      if (confidential) {
        path = `${path}&confidential=${confidential}`;
      }
      if (excludeLabels) {
        path = `${path}&not[labels]=${excludeLabels}`;
      }
      if (excludeMilestone) {
        path = `${path}&not[milestone]=${excludeMilestone}`;
      }
      if (excludeAuthor) {
        path = `${path}&not[author_username]=${excludeAuthor}`;
      }
      if (excludeAssignee) {
        path = `${path}&not[assignee_username]=${excludeAssignee}`;
      }
      if (excludeSearch) {
        path = `${path}&not[search]=${excludeSearch}`;
      }
      if (excludeSearchIn) {
        path = `${path}&not[in]=${excludeSearchIn}`;
      }
    }
    if (orderBy) {
      path = `${path}&order_by=${orderBy}`;
    }
    if (sort) {
      path = `${path}&sort=${sort}`;
    }
    if (maxResults) {
      path = `${path}&per_page=${parseInt(maxResults, 10)}`;
    }
    if (reportTypes) {
      path = `${path}&report_type=${reportTypes}`;
    }
    if (severityLevels) {
      path = `${path}&severity=${severityLevels}`;
    }
    if (confidenceLevels) {
      path = `${path}&confidence=${confidenceLevels}`;
    }
    if (pipelineId) {
      if (pipelineId === 'branch') {
        pipelineId = await fetchLastPipelineForCurrentBranch(project);
      }
      path = `${path}&pipeline_id=${pipelineId}`;
    }
    const { response } = await fetch(path);
    issuable = response;
  }
  return issuable;
}

async function fetchLastJobsForCurrentBranch(pipeline, workspaceFolder) {
  const project = await fetchCurrentPipelineProject(workspaceFolder);
  if (project) {
    const { response } = await fetch(`/projects/${project.id}/pipelines/${pipeline.id}/jobs`);
    let jobs = response;

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

async function fetchOpenMergeRequestForCurrentBranch(workspaceFolder) {
  const project = await fetchCurrentProjectSwallowError(workspaceFolder);
  const branchName = await createGitService(workspaceFolder).fetchTrackingBranchName();

  const path = `/projects/${project.id}/merge_requests?state=opened&source_branch=${branchName}`;
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
async function handlePipelineAction(action, workspaceFolder) {
  const pipeline = await fetchLastPipelineForCurrentBranch(workspaceFolder);
  const project = await fetchCurrentProjectSwallowError(workspaceFolder);

  if (pipeline && project) {
    let endpoint = `/projects/${project.id}/pipelines/${pipeline.id}/${action}`;
    let newPipeline = null;

    if (action === 'create') {
      const branchName = await createGitService(workspaceFolder).fetchTrackingBranchName();
      endpoint = `/projects/${project.id}/pipeline?ref=${branchName}`;
    }

    try {
      const { response } = await fetch(endpoint, 'POST');
      newPipeline = response;
    } catch (e) {
      vscode.gitLabWorkflow.handleError(new UserFriendlyError(`Failed to ${action} pipeline.`, e));
    }

    if (newPipeline) {
      statusBar.refreshPipeline();
    }
  } else {
    vscode.window.showErrorMessage('GitLab Workflow: No project or pipeline found.');
  }
}

async function fetchMRIssues(mrId, workspaceFolder) {
  const project = await fetchCurrentProjectSwallowError(workspaceFolder);
  let issues = [];

  if (project) {
    try {
      const { response } = await fetch(
        `/projects/${project.id}/merge_requests/${mrId}/closes_issues`,
      );
      issues = response;
    } catch (e) {
      vscode.gitLabWorkflow.logError(e);
    }
  }

  return issues;
}

async function createSnippet(data) {
  let snippet;
  let path = '/snippets';

  if (data.id) {
    path = `/projects/${data.id}/snippets`;
  }

  try {
    const { response } = await fetch(path, 'POST', data);
    snippet = response;
  } catch (e) {
    vscode.gitLabWorkflow.handleError(new UserFriendlyError('Failed to create your snippet.', e));
  }

  return snippet;
}

async function validateCIConfig(content) {
  let validCIConfig = null;

  try {
    const { response } = await fetch('/ci/lint', 'POST', { content });
    validCIConfig = response;
  } catch (e) {
    vscode.gitLabWorkflow.handleError(
      new UserFriendlyError('Failed to validate CI configuration.', e),
    );
  }

  return validCIConfig;
}

async function fetchLabelEvents(issuable) {
  let labelEvents = [];

  try {
    const type = issuable.sha ? 'merge_requests' : 'issues';
    const { response } = await fetch(
      `/projects/${issuable.project_id}/${type}/${issuable.iid}/resource_label_events?sort=asc&per_page=100`,
    );
    labelEvents = response;
  } catch (e) {
    vscode.gitLabWorkflow.handleError(
      new UserFriendlyError('Failed to fetch label events for this issuable.', e),
    );
  }

  labelEvents.forEach(el => {
    // Temporarily disable eslint to be able to start enforcing stricter rules
    // eslint-disable-next-line no-param-reassign
    el.body = '';
  });
  return labelEvents;
}

async function fetchDiscussions(issuable, page = 1) {
  let discussions = [];

  try {
    const type = issuable.sha ? 'merge_requests' : 'issues';
    const { response, headers } = await fetch(
      `/projects/${issuable.project_id}/${type}/${issuable.iid}/discussions?sort=asc&per_page=5&page=${page}`,
      'GET',
      null,
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
      delete discussions.headers;
    }
  } catch (e) {
    vscode.gitLabWorkflow.handleError(
      new UserFriendlyError('Failed to fetch discussions for this issuable.', e),
    );
  }

  return discussions;
}

async function renderMarkdown(markdown, workspaceFolder) {
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
      project: project.path_with_namespace,
      gfm: 'true', // Needs to be a string for the API
    });
    rendered = response;
  } catch (e) {
    vscode.gitLabWorkflow.logError(e);
    return markdown;
  }

  return rendered.html;
}

async function saveNote({ issuable, note, noteType }) {
  try {
    const projectId = issuable.project_id;
    const { iid } = issuable;
    const { path } = noteType;
    const { response } = await fetch(`/projects/${projectId}/${path}/${iid}/notes`, 'POST', {
      body: note,
    });
    return response;
  } catch (e) {
    vscode.gitLabWorkflow.logError(e);
  }

  return { success: false };
}

exports.fetchCurrentUser = fetchCurrentUser;
exports.fetchIssuables = fetchIssuables;
exports.fetchOpenMergeRequestForCurrentBranch = fetchOpenMergeRequestForCurrentBranch;
exports.fetchLastPipelineForCurrentBranch = fetchLastPipelineForCurrentBranch;
exports.fetchLastJobsForCurrentBranch = fetchLastJobsForCurrentBranch;
exports.fetchCurrentProject = fetchCurrentProject;
exports.fetchCurrentProjectSwallowError = fetchCurrentProjectSwallowError;
exports.fetchCurrentPipelineProject = fetchCurrentPipelineProject;
exports.handlePipelineAction = handlePipelineAction;
exports.fetchMRIssues = fetchMRIssues;
exports.createSnippet = createSnippet;
exports.validateCIConfig = validateCIConfig;
exports.fetchVersion = fetchVersion;
exports.fetchDiscussions = fetchDiscussions;
exports.renderMarkdown = renderMarkdown;
exports.saveNote = saveNote;
exports.getCurrentWorkspaceFolderOrSelectOne = getCurrentWorkspaceFolderOrSelectOne;
exports.getAllGitlabProjects = getAllGitlabProjects;
exports.getCurrenWorkspaceFolder = getCurrentWorkspaceFolder;
exports.fetchLabelEvents = fetchLabelEvents;
