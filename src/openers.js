const vscode = require('vscode');
const GitService = require('./git_service');
const gitLabService = require('./gitlab_service');
const tokenService = require('./token_service');

const openUrl = url => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));

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
async function getLink(linkTemplate, workspaceFolder) {
  const user = await gitLabService.fetchCurrentUser();
  const project = await gitLabService.fetchCurrentProject(workspaceFolder);

  return linkTemplate.replace('$userId', user.id).replace('$projectUrl', project.web_url);
}

async function openLink(linkTemplate, workspaceFolder) {
  await openUrl(await getLink(linkTemplate, workspaceFolder));
}

async function showIssues() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  await openLink('$projectUrl/issues?assignee_id=$userId', workspaceFolder);
}

async function showMergeRequests() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  await openLink('$projectUrl/merge_requests?assignee_id=$userId', workspaceFolder);
}

async function getActiveFile() {
  const editor = vscode.window.activeTextEditor;
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri).uri.fsPath;

  if (!editor) {
    vscode.window.showInformationMessage('GitLab Workflow: No open file.');
    return undefined;
  }
  let currentProject;
  try {
    currentProject = await gitLabService.fetchCurrentProject(workspaceFolder);
  } catch (e) {
    vscode.gitLabWorkflow.handleError(e);
    return undefined;
  }
  const branchName = await createGitService(workspaceFolder).fetchTrackingBranchName();
  const filePath = editor.document.uri.path.replace(`${workspaceFolder}/`, '');
  const fileUrl = `${currentProject.web_url}/blob/${branchName}/${filePath}`;
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

async function openActiveFile() {
  await openUrl(await getActiveFile());
}

async function copyLinkToActiveFile() {
  const fileUrl = await getActiveFile();
  await vscode.env.clipboard.writeText(fileUrl);
}

async function openCurrentMergeRequest() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  const mr = await gitLabService.fetchOpenMergeRequestForCurrentBranch(workspaceFolder);

  if (mr) {
    await openUrl(mr.web_url);
  }
}

async function openCreateNewIssue() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  openLink('$projectUrl/issues/new', workspaceFolder);
}

async function openCreateNewMr() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  const project = await gitLabService.fetchCurrentProject(workspaceFolder);
  const branchName = await createGitService(workspaceFolder).fetchTrackingBranchName();

  openUrl(`${project.web_url}/merge_requests/new?merge_request%5Bsource_branch%5D=${branchName}`);
}

async function openProjectPage() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  openLink('$projectUrl', workspaceFolder);
}

async function openCurrentPipeline(workspaceFolder) {
  if (!workspaceFolder) {
    // Temporarily disable eslint to be able to start enforcing stricter rules
    // eslint-disable-next-line no-param-reassign
    workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  }
  const project = await gitLabService.fetchCurrentPipelineProject(workspaceFolder);

  if (project) {
    const pipeline = await gitLabService.fetchLastPipelineForCurrentBranch(workspaceFolder);

    if (pipeline) {
      openUrl(`${project.web_url}/pipelines/${pipeline.id}`);
    }
  }
}

async function compareCurrentBranch() {
  let project = null;
  let lastCommitId = null;
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();

  project = await gitLabService.fetchCurrentProject(workspaceFolder);
  lastCommitId = await createGitService(workspaceFolder).fetchLastCommitId();

  if (project && lastCommitId) {
    openUrl(`${project.web_url}/compare/master...${lastCommitId}`);
  }
}

exports.openUrl = openUrl;
exports.showIssues = showIssues;
exports.showMergeRequests = showMergeRequests;
exports.openActiveFile = openActiveFile;
exports.copyLinkToActiveFile = copyLinkToActiveFile;
exports.openCurrentMergeRequest = openCurrentMergeRequest;
exports.openCreateNewIssue = openCreateNewIssue;
exports.openCreateNewMr = openCreateNewMr;
exports.openProjectPage = openProjectPage;
exports.openCurrentPipeline = openCurrentPipeline;
exports.compareCurrentBranch = compareCurrentBranch;
