import * as path from 'path';
import * as vscode from 'vscode';
import { VS_COMMANDS } from './command_names';
import {
  GitLabRepositoryAndFile,
  ProjectCommand,
  ProjectFileCommand,
} from './commands/run_with_valid_project';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { GitLabRepository } from './git/wrapped_repository';
import { ifVersionGte } from './utils/if_version_gte';

export const openUrl = async (url: string): Promise<void> => {
  // workaround for a VS Code open command bug: https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/44
  const urlArgument = ifVersionGte<string | vscode.Uri>(
    vscode.version,
    '1.65.0',
    () => url,
    () => vscode.Uri.parse(url),
  );
  await vscode.commands.executeCommand(VS_COMMANDS.OPEN, urlArgument);
};

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
 * @param {GitLabRepository} repository with valid gitlab project
 */
async function getLink(linkTemplate: string, repository: GitLabRepository) {
  const user = await repository.getGitLabService().getCurrentUser();
  const project = await repository.getProject();
  return linkTemplate.replace('$userId', user.id.toString()).replace('$projectUrl', project.webUrl);
}

async function openTemplatedLink(linkTemplate: string, repository: GitLabRepository) {
  await openUrl(await getLink(linkTemplate, repository));
}

export const showIssues: ProjectCommand = async gitlabRepository => {
  await openTemplatedLink('$projectUrl/issues?assignee_id=$userId', gitlabRepository);
};

export const showMergeRequests: ProjectCommand = async gitlabRepository => {
  await openTemplatedLink('$projectUrl/merge_requests?assignee_id=$userId', gitlabRepository);
};

async function getActiveFile({ repository, activeEditor }: GitLabRepositoryAndFile) {
  const branchName = await repository.getTrackingBranchName();
  const filePath = path
    .relative(repository.rootFsPath, activeEditor.document.uri.fsPath)
    .replace(/\\/g, '/');
  const project = await repository.getProject();
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

export const openCurrentMergeRequest: ProjectCommand = async gitlabRepository => {
  const mr = await gitlabRepository
    .getGitLabService()
    .getOpenMergeRequestForCurrentBranch(
      await gitlabRepository.getProject(),
      await gitlabRepository.getTrackingBranchName(),
    );

  if (mr) {
    await openUrl(mr.web_url);
  }
};

export const openCreateNewIssue: ProjectCommand = async gitlabRepository => {
  await openTemplatedLink('$projectUrl/issues/new', gitlabRepository);
};

export const openCreateNewMr: ProjectCommand = async gitlabRepository => {
  const project = await gitlabRepository.getProject();
  const branchName = await gitlabRepository.getTrackingBranchName();

  await openUrl(
    `${project.webUrl}/merge_requests/new?merge_request%5Bsource_branch%5D=${encodeURIComponent(
      branchName,
    )}`,
  );
};

export const openProjectPage: ProjectCommand = async gitlabRepository => {
  await openTemplatedLink('$projectUrl', gitlabRepository);
};

// FIXME pass in GitLabRepository instead of the root
export async function openCurrentPipeline(repositoryRoot: string): Promise<void> {
  const repository = gitExtensionWrapper.getRepository(repositoryRoot);
  const { pipeline } = await repository
    .getGitLabService()
    .getPipelineAndMrForCurrentBranch(
      (await repository.getProject())!,
      await repository.getTrackingBranchName(),
    );

  if (pipeline) {
    await openUrl(pipeline.web_url);
  }
}

export const compareCurrentBranch: ProjectCommand = async gitlabRepository => {
  const project = await gitlabRepository.getProject();

  if (gitlabRepository.lastCommitSha) {
    await openUrl(`${project.webUrl}/compare/master...${gitlabRepository.lastCommitSha}`);
  }
};
