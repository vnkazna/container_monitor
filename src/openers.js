const vscode = require('vscode');
const gitService = require('./git_service');
const gitLabService = require('./gitlab_service');

const openUrl = url => {
  vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(url));
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
 * @param {string} link
 */
async function openLink(link, workspaceFolder) {
  const user = await gitLabService.fetchCurrentUser();

  if (user) {
    const project = await gitLabService.fetchCurrentProject(workspaceFolder);

    if (project) {
      openUrl(link.replace('$userId', user.id).replace('$projectUrl', project.web_url));
    } else {
      vscode.window.showInformationMessage(
        'GitLab Workflow: Failed to open file on web. No GitLab project.',
      );
    }
  } else {
    vscode.window.showInformationMessage(
      'GitLab Workflow: GitLab user not found. Check your Personal Access Token.',
    );
  }
}

async function showIssues() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  openLink('$projectUrl/issues?assignee_id=$userId', workspaceFolder);
}

async function showMergeRequests() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  openLink('$projectUrl/merge_requests?assignee_id=$userId', workspaceFolder);
}

async function openActiveFile() {
  const editor = vscode.window.activeTextEditor;
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri).uri.fsPath;

  if (editor) {
    const currentProject = await gitLabService.fetchCurrentProject(workspaceFolder);

    if (currentProject) {
      const branchName = await gitService.fetchTrackingBranchName(workspaceFolder);
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

      openUrl(`${fileUrl}${anchor}`);
    } else {
      vscode.window.showInformationMessage(
        'GitLab Workflow: Failed to open file on web. No GitLab project.',
      );
    }
  } else {
    vscode.window.showInformationMessage('GitLab Workflow: No open file.');
  }
}

async function openCurrentMergeRequest() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  const mr = await gitLabService.fetchOpenMergeRequestForCurrentBranch(workspaceFolder);

  if (mr) {
    openUrl(mr.web_url);
  }
}

async function openCreateNewIssue() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  openLink('$projectUrl/issues/new', workspaceFolder);
}

async function openCreateNewMr() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();

  const project = await gitLabService.fetchCurrentProject(workspaceFolder);

  if (project) {
    const branchName = await gitService.fetchTrackingBranchName(workspaceFolder);

    openUrl(`${project.web_url}/merge_requests/new?merge_request%5Bsource_branch%5D=${branchName}`);
  } else {
    vscode.window.showInformationMessage(
      'GitLab Workflow: Failed to open file on web. No GitLab project.',
    );
  }
}

async function openProjectPage() {
  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();
  openLink('$projectUrl', workspaceFolder);
}

async function openCurrentPipeline(workspaceFolder) {
  if (!workspaceFolder) {
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

  try {
    project = await gitLabService.fetchCurrentProject(workspaceFolder);
    lastCommitId = await gitService.fetchLastCommitId(workspaceFolder);
  } catch (e) {
    console.log('Failed to run compareCurrentBranch command', e);
  }

  if (project && lastCommitId) {
    openUrl(`${project.web_url}/compare/master...${lastCommitId}`);
  }
}

exports.openUrl = openUrl;
exports.showIssues = showIssues;
exports.showMergeRequests = showMergeRequests;
exports.openActiveFile = openActiveFile;
exports.openCurrentMergeRequest = openCurrentMergeRequest;
exports.openCreateNewIssue = openCreateNewIssue;
exports.openCreateNewMr = openCreateNewMr;
exports.openProjectPage = openProjectPage;
exports.openCurrentPipeline = openCurrentPipeline;
exports.compareCurrentBranch = compareCurrentBranch;
