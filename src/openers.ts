import * as path from 'path';
import * as vscode from 'vscode';
import assert from 'assert';
import * as gitLabService from './gitlab_service';
import { VS_COMMANDS } from './command_names';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { WrappedRepository } from './git/wrapped_repository';
import { GitLabProject } from './gitlab/gitlab_project';
import {
  ProjectCommand,
  ProjectFileCommand,
  RepositoryWithProjectFile,
} from './commands/run_with_valid_project';

export const openUrl = async (url: string): Promise<void> =>
  vscode.commands.executeCommand(VS_COMMANDS.OPEN, vscode.Uri.parse(url));

/**
 * Fetches user and project before opening a link.
 * Link can contain some placeholders which will be replaced by this method
 * with relevant information. Implemented placeholders below.
 *
 * $projectUrl
 * $userId
 *
 * An example link is `$projectUrl/issues?assignee_id=$userId` which will be
 * `gitlab.com/gitlab-org/gitlab-ce/issues?assignee_id=502136`.
 *
 * @param {string} linkTemplate
 */
async function getLink(linkTemplate: string, repository: WrappedRepository) {
  const user = await gitLabService.fetchCurrentUser(repository.rootFsPath);
  const project = await repository.getProject();

  assert(project, 'Failed to fetch project');
  return linkTemplate.replace('$userId', user.id.toString()).replace('$projectUrl', project.webUrl);
}

async function getLinkNew(
  linkTemplate: string,
  repository: WrappedRepository,
  project: GitLabProject,
) {
  const user = await gitLabService.fetchCurrentUser(repository.rootFsPath);
  return linkTemplate.replace('$userId', user.id.toString()).replace('$projectUrl', project.webUrl);
}

async function openTemplatedLink(linkTemplate: string) {
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  if (!repository) return;
  await openUrl(await getLink(linkTemplate, repository));
}

async function openTemplatedLinkNew(
  linkTemplate: string,
  repository: WrappedRepository,
  project: GitLabProject,
) {
  await openUrl(await getLinkNew(linkTemplate, repository, project));
}

export const showIssues: ProjectCommand = async ({ repository, project }) => {
  await openTemplatedLinkNew('$projectUrl/issues?assignee_id=$userId', repository, project);
};

export async function showMergeRequests(): Promise<void> {
  await openTemplatedLink('$projectUrl/merge_requests?assignee_id=$userId');
}

async function getActiveFile({ repository, project, activeEditor }: RepositoryWithProjectFile) {
  const branchName = await repository.getTrackingBranchName();
  const filePath = path
    .relative(repository.rootFsPath, activeEditor.document.uri.fsPath)
    .replace(/\\/g, '/');
  const fileUrl = `${project.webUrl}/blob/${encodeURIComponent(branchName)}/${filePath}`;
  let anchor = '';

  if (activeEditor.selection) {
    const { start, end } = activeEditor.selection;
    anchor = `#L${start.line + 1}`;

    if (end.line > start.line) {
      anchor += `-${end.line + 1}`;
    }
  }

  return `${fileUrl}${anchor}`;
}

export const openActiveFile: ProjectFileCommand = async repositoryWithProjectFile => {
  await openUrl(await getActiveFile(repositoryWithProjectFile));
};

export const copyLinkToActiveFile: ProjectFileCommand = async repositoryWithProjectFile => {
  const fileUrl = await getActiveFile(repositoryWithProjectFile);
  await vscode.env.clipboard.writeText(fileUrl);
};

export async function openCurrentMergeRequest(): Promise<void> {
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  if (!repository) return;

  const mr = await gitLabService.fetchOpenMergeRequestForCurrentBranch(repository.rootFsPath);

  if (mr) {
    await openUrl(mr.web_url);
  }
}

export async function openCreateNewIssue(): Promise<void> {
  await openTemplatedLink('$projectUrl/issues/new');
}

export async function openCreateNewMr(): Promise<void> {
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  if (!repository) return;
  const project = await repository.getProject();
  const branchName = await repository.getTrackingBranchName();

  await openUrl(
    `${project!.webUrl}/merge_requests/new?merge_request%5Bsource_branch%5D=${encodeURIComponent(
      branchName,
    )}`,
  );
}

export async function openProjectPage(): Promise<void> {
  await openTemplatedLink('$projectUrl');
}

export async function openCurrentPipeline(repositoryRoot: string): Promise<void> {
  const { pipeline } = await gitLabService.fetchPipelineAndMrForCurrentBranch(repositoryRoot);

  if (pipeline) {
    await openUrl(pipeline.web_url);
  }
}

export async function compareCurrentBranch(): Promise<void> {
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  if (!repository) return;

  const project = await repository.getProject();

  if (project && repository.lastCommitSha) {
    await openUrl(`${project.webUrl}/compare/master...${repository.lastCommitSha}`);
  }
}
