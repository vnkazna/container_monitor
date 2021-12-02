import * as vscode from 'vscode';
import request from 'request-promise';
import { tokenService } from './services/token_service';
import { UserFriendlyError } from './errors/user_friendly_error';
import { ApiError } from './errors/api_error';
import { handleError, logError } from './log';
import { getUserAgentHeader } from './utils/get_user_agent_header';
import { getHttpAgentOptions } from './utils/get_http_agent_options';
import { getInstanceUrl } from './utils/get_instance_url';
import { GitLabProject } from './gitlab/gitlab_project';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { getExtensionConfiguration } from './utils/extension_configuration';
import { README_SECTIONS } from './constants';
import { HelpError } from './errors/help_error';

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
