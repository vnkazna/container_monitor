import * as path from 'path';
import * as vscode from 'vscode';
import * as assert from 'assert';
import * as gitLabService from './gitlab_service';
import { createGitService } from './service_factory';
import { handleError } from './log';
import { VS_COMMANDS } from './command_names';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { WrappedRepository } from './git/wrapped_repository';

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
  const project = await gitLabService.fetchCurrentProject(repository.rootFsPath);

  assert(project, 'Failed to fetch project');
  return linkTemplate.replace('$userId', user.id.toString()).replace('$projectUrl', project.webUrl);
}

async function openTemplatedLink(linkTemplate: string) {
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  if (!repository) return;
  await openUrl(await getLink(linkTemplate, repository));
}

export async function showIssues(): Promise<void> {
  await openTemplatedLink('$projectUrl/issues?assignee_id=$userId');
}

export async function showMergeRequests(): Promise<void> {
  await openTemplatedLink('$projectUrl/merge_requests?assignee_id=$userId');
}

async function getActiveFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('GitLab Workflow: No open file.');
    return undefined;
  }

  const repository = gitExtensionWrapper.getActiveRepository();

  if (!repository) {
    vscode.window.showInformationMessage('GitLab Workflow: Open file isn’t part of a repository.');
    return undefined;
  }

  let currentProject;
  try {
    currentProject = await gitLabService.fetchCurrentProject(repository.rootFsPath);
  } catch (e) {
    handleError(e);
    return undefined;
  }

  const gitService = createGitService(repository.rootFsPath);
  const branchName = await gitService.fetchTrackingBranchName();
  const filePath = path.relative(
    await gitService.getRepositoryRootFolder(),
    editor.document.uri.fsPath,
  );
  const fileUrl = `${currentProject!.webUrl}/blob/${branchName}/${filePath}`;
  let anchor = '';

  if (editor.selection) {
    const { start, end } = editor.selection;
    anchor = `#L${start.line + 1}`;

    if (end.line > start.line) {
      anchor += `-${end.line + 1}`;
    }
  }

  return `${fileUrl}${anchor}`;
}

export async function openActiveFile(): Promise<void> {
  await openUrl((await getActiveFile())!);
}

export async function copyLinkToActiveFile(): Promise<void> {
  const fileUrl = await getActiveFile();

  if (fileUrl) {
    await vscode.env.clipboard.writeText(fileUrl);
  }
}

export async function openCurrentMergeRequest(): Promise<void> {
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  if (!repository) return;

  const mr = await gitLabService.fetchOpenMergeRequestForCurrentBranch(repository.rootFsPath);

  if (mr) {
    await openUrl(mr.web_url);
  }
}

export async function openCreateNewIssue(): Promise<void> {
  openTemplatedLink('$projectUrl/issues/new');
}

export async function openCreateNewMr(): Promise<void> {
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  if (!repository) return;
  const project = await gitLabService.fetchCurrentProject(repository.rootFsPath);
  const branchName = await createGitService(repository.rootFsPath).fetchTrackingBranchName();

  openUrl(`${project!.webUrl}/merge_requests/new?merge_request%5Bsource_branch%5D=${branchName}`);
}

export async function openProjectPage(): Promise<void> {
  openTemplatedLink('$projectUrl');
}

export async function openCurrentPipeline(workspaceFolder: string): Promise<void> {
  const { pipeline } = await gitLabService.fetchPipelineAndMrForCurrentBranch(workspaceFolder);

  if (pipeline) {
    openUrl(pipeline.web_url);
  }
}

export async function compareCurrentBranch(): Promise<void> {
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  if (!repository) return;

  const project = await gitLabService.fetchCurrentProject(repository.rootFsPath);
  const lastCommitId = await createGitService(repository.rootFsPath).fetchLastCommitId();

  if (project && lastCommitId) {
    openUrl(`${project.webUrl}/compare/master...${lastCommitId}`);
  }
}
