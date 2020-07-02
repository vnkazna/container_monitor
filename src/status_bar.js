const vscode = require('vscode');
const openers = require('./openers');
const gitLabService = require('./gitlab_service');

let context = null;
let pipelineStatusBarItem = null;
let pipelinesStatusTimer = null;
let mrStatusBarItem = null;
let mrIssueStatusBarItem = null;
let mrStatusTimer = null;
let issue = null;
let mr = null;
let firstRun = true;
const {
  showStatusBarLinks,
  showIssueLinkOnStatusBar,
  showMrStatusOnStatusBar,
  showPipelineUpdateNotifications,
} = vscode.workspace.getConfiguration('gitlab');

const createStatusBarItem = (text, command) => {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  context.subscriptions.push(statusBarItem);
  statusBarItem.text = text;
  statusBarItem.show();

  if (command) {
    statusBarItem.command = command;
  }

  return statusBarItem;
};

const commandRegisterHelper = (cmdName, callback) => {
  vscode.commands.registerCommand(cmdName, callback);
};

async function refreshPipeline() {
  const editor = vscode.window.activeTextEditor;
  let workspaceFolder = null;
  let project = null;
  let pipeline = null;
  const maxJobs = 4;
  const statuses = {
    running: { icon: 'pulse' },
    pending: { icon: 'clock' },
    success: { icon: 'check', text: 'passed' },
    failed: { icon: 'x' },
    canceled: { icon: 'circle-slash' },
    skipped: { icon: 'diff-renamed' },
  };

  try {
    workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri).uri.fsPath;
    project = await gitLabService.fetchCurrentPipelineProject(workspaceFolder);
    if (project != null) {
      pipeline = await gitLabService.fetchLastPipelineForCurrentBranch(workspaceFolder);
    } else {
      pipelineStatusBarItem.hide();
    }
  } catch (e) {
    if (!project) {
      pipelineStatusBarItem.hide();
      return;
    }
  }

  if (pipeline) {
    const { status } = pipeline;
    let statusText = statuses[status].text || status;

    if (status === 'running' || status === 'failed') {
      try {
        const jobs = await gitLabService.fetchLastJobsForCurrentBranch(pipeline, workspaceFolder);
        if (jobs) {
          const jobsName = jobs.filter(job => job.status === status).map(job => job.name);
          if (jobsName.length > maxJobs) {
            statusText += ' (';
            statusText += jobsName.slice(0, maxJobs).join(', ');
            statusText += `, +${jobsName.length - maxJobs} jobs`;
            statusText += ')';
          } else {
            statusText += ` (${jobsName.join(', ')})`;
          }
        }
      } catch (e) {
        vscode.window.showErrorMessage(`GitLab Workflow: Failed to fetch jobs for pipeline.`);
      }
    }

    const msg = `$(${statuses[status].icon}) GitLab: Pipeline ${statusText}`;

    if (showPipelineUpdateNotifications && pipelineStatusBarItem.text !== msg && !firstRun) {
      const message = `Pipeline ${statusText}.`;

      vscode.window
        .showInformationMessage(message, { modal: false }, 'View in Gitlab')
        .then(selection => {
          if (selection === 'View in Gitlab') {
            openers.openCurrentPipeline(workspaceFolder);
          }
        });
    }

    pipelineStatusBarItem.text = msg;
    pipelineStatusBarItem.show();
  } else {
    pipelineStatusBarItem.text = 'GitLab: No pipeline.';
  }
  firstRun = false;
}

const initPipelineStatus = () => {
  pipelineStatusBarItem = createStatusBarItem(
    '$(info) GitLab: Fetching pipeline...',
    'gl.pipelineActions',
  );

  pipelinesStatusTimer = setInterval(() => {
    refreshPipeline();
  }, 30000);

  refreshPipeline();
};

async function fetchMRIssues(workspaceFolder) {
  const issues = await gitLabService.fetchMRIssues(mr.iid, workspaceFolder);
  let text = `$(code) GitLab: No issue.`;

  if (issues[0]) {
    [issue] = issues;
    text = `$(code) GitLab: Issue #${issue.iid}`;
  }

  mrIssueStatusBarItem.text = text;
}

async function fetchBranchMR() {
  const editor = vscode.window.activeTextEditor;
  let text = '$(git-pull-request) GitLab: No MR.';
  let workspaceFolder = null;
  let project = null;

  try {
    workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri).uri.fsPath;
    project = await gitLabService.fetchCurrentProject(workspaceFolder);
    if (project != null) {
      mr = await gitLabService.fetchOpenMergeRequestForCurrentBranch(workspaceFolder);
      mrStatusBarItem.show();
    } else {
      mrStatusBarItem.hide();
    }
  } catch (e) {
    mrStatusBarItem.hide();
  }

  if (project && mr) {
    text = `$(git-pull-request) GitLab: MR !${mr.iid}`;
    fetchMRIssues(workspaceFolder);
    mrIssueStatusBarItem.show();
  } else if (project) {
    mrIssueStatusBarItem.text = `$(code) GitLab: No issue.`;
    mrIssueStatusBarItem.show();
  } else {
    mrIssueStatusBarItem.hide();
  }

  mrStatusBarItem.text = text;
}

const initMrStatus = () => {
  const cmdName = `gl.mrOpener${Date.now()}`;
  commandRegisterHelper(cmdName, () => {
    if (mr) {
      openers.openUrl(mr.web_url);
    } else {
      vscode.window.showInformationMessage('GitLab Workflow: No MR found for this branch.');
    }
  });

  mrStatusBarItem = createStatusBarItem('$(info) GitLab: Finding MR...', cmdName);
  mrStatusTimer = setInterval(() => {
    fetchBranchMR();
  }, 60000);

  fetchBranchMR();
};

const initMrIssueStatus = () => {
  const cmdName = `gl.mrIssueOpener${Date.now()}`;
  commandRegisterHelper(cmdName, () => {
    if (issue) {
      openers.openUrl(issue.web_url);
    } else {
      vscode.window.showInformationMessage('GitLab Workflow: No closing issue found for this MR.');
    }
  });

  mrIssueStatusBarItem = createStatusBarItem('$(info) GitLab: Fetching closing issue...', cmdName);
};

const init = ctx => {
  context = ctx;

  if (showStatusBarLinks) {
    initPipelineStatus();

    if (showIssueLinkOnStatusBar) {
      initMrIssueStatus();
    }
    if (showMrStatusOnStatusBar) {
      initMrStatus();
    }
  }
};

const dispose = () => {
  mrStatusBarItem.dispose();
  pipelineStatusBarItem.dispose();
  if (showIssueLinkOnStatusBar) {
    mrIssueStatusBarItem.dispose();
  }

  if (pipelinesStatusTimer) {
    clearInterval(pipelinesStatusTimer);
    pipelinesStatusTimer = null;
  }

  if (mrStatusTimer) {
    clearInterval(mrStatusTimer);
    mrStatusTimer = null;
  }
};

exports.init = init;
exports.dispose = dispose;
exports.refreshPipeline = refreshPipeline;
