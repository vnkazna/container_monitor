const vscode = require('vscode');
const openers = require('./openers');
const gitLabService = require('./gitlab_service');
const { getCurrentWorkspaceFolder } = require('./services/workspace_service');
const { UserFriendlyError } = require('./errors/user_friendly_error');
const { handleError, logError } = require('./log');
const { USER_COMMANDS } = require('./command_names');

const MAXIMUM_DISPLAYED_JOBS = 4;

const {
  showStatusBarLinks,
  showIssueLinkOnStatusBar,
  showMrStatusOnStatusBar,
  showPipelineUpdateNotifications,
} = vscode.workspace.getConfiguration('gitlab');

const iconForStatus = {
  running: { icon: 'pulse' },
  pending: { icon: 'clock' },
  success: { icon: 'check', text: 'passed' },
  failed: { icon: 'x' },
  canceled: { icon: 'circle-slash' },
  skipped: { icon: 'diff-renamed' },
};

const getStatusText = status => iconForStatus[status].text || status;

const createStatusTextFromJobs = (jobs, status) => {
  let statusText = getStatusText(status);
  const jobNames = jobs.filter(job => job.status === status).map(job => job.name);
  if (jobNames.length > MAXIMUM_DISPLAYED_JOBS) {
    statusText += ' (';
    statusText += jobNames.slice(0, MAXIMUM_DISPLAYED_JOBS).join(', ');
    statusText += `, +${jobNames.length - MAXIMUM_DISPLAYED_JOBS} jobs`;
    statusText += ')';
  } else if (jobNames.length > 0) {
    statusText += ` (${jobNames.join(', ')})`;
  }
  return statusText;
};

const createStatusBarItem = (text, command) => {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
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

class StatusBar {
  constructor() {
    this.pipelineStatusBarItem = null;
    this.pipelinesStatusTimer = null;
    this.mrStatusBarItem = null;
    this.mrIssueStatusBarItem = null;
    this.mrStatusTimer = null;
    this.issue = null;
    this.mr = null;
    this.firstRun = true;
  }

  async refreshPipeline() {
    let workspaceFolder = null;
    let project = null;
    let pipeline = null;

    try {
      workspaceFolder = await getCurrentWorkspaceFolder();
      project = await gitLabService.fetchCurrentPipelineProject(workspaceFolder);
      if (project != null) {
        pipeline = await gitLabService.fetchLastPipelineForCurrentBranch(workspaceFolder);
      } else {
        this.pipelineStatusBarItem.hide();
      }
    } catch (e) {
      logError(e);
      if (!project) {
        this.pipelineStatusBarItem.hide();
        return;
      }
    }

    if (pipeline) {
      const { status } = pipeline;
      let statusText = getStatusText(status);

      if (status === 'running' || status === 'failed') {
        try {
          const jobs = await gitLabService.fetchLastJobsForCurrentBranch(pipeline, workspaceFolder);
          if (jobs) {
            statusText = createStatusTextFromJobs(jobs, status);
          }
        } catch (e) {
          handleError(new UserFriendlyError('Failed to fetch jobs for pipeline.', e));
        }
      }

      const msg = `$(${iconForStatus[status].icon}) GitLab: Pipeline ${statusText}`;

      if (
        showPipelineUpdateNotifications &&
        this.pipelineStatusBarItem.text !== msg &&
        !this.firstRun
      ) {
        const message = `Pipeline ${statusText}.`;

        vscode.window
          .showInformationMessage(message, { modal: false }, 'View in Gitlab')
          .then(selection => {
            if (selection === 'View in Gitlab') {
              openers.openCurrentPipeline(workspaceFolder);
            }
          });
      }

      this.pipelineStatusBarItem.text = msg;
      this.pipelineStatusBarItem.show();
    } else {
      this.pipelineStatusBarItem.text = 'GitLab: No pipeline.';
    }
    this.firstRun = false;
  }

  async initPipelineStatus() {
    this.pipelineStatusBarItem = createStatusBarItem(
      '$(info) GitLab: Fetching pipeline...',
      USER_COMMANDS.PIPELINE_ACTIONS,
    );

    this.pipelinesStatusTimer = setInterval(() => {
      this.refreshPipeline();
    }, 30000);

    await this.refreshPipeline();
  }

  async fetchMRIssues(workspaceFolder) {
    const issues = await gitLabService.fetchMRIssues(this.mr.iid, workspaceFolder);
    let text = `$(code) GitLab: No issue.`;

    if (issues[0]) {
      [this.issue] = issues;
      text = `$(code) GitLab: Issue #${this.issue.iid}`;
    }

    this.mrIssueStatusBarItem.text = text;
  }

  async fetchBranchMR() {
    let text = '$(git-pull-request) GitLab: Create MR.';
    let workspaceFolder = null;
    let project = null;

    try {
      workspaceFolder = await getCurrentWorkspaceFolder();
      project = await gitLabService.fetchCurrentProject(workspaceFolder);
      if (project != null) {
        this.mr = await gitLabService.fetchOpenMergeRequestForCurrentBranch(workspaceFolder);
        this.mrStatusBarItem.show();
      } else {
        this.mrStatusBarItem.hide();
      }
    } catch (e) {
      logError(e);
      this.mrStatusBarItem.hide();
    }

    if (project && this.mr) {
      text = `$(git-pull-request) GitLab: MR !${this.mr.iid}`;
      await this.fetchMRIssues(workspaceFolder);
      this.mrIssueStatusBarItem.show();
    } else if (project) {
      this.mrIssueStatusBarItem.text = `$(code) GitLab: No issue.`;
      this.mrIssueStatusBarItem.show();
    } else {
      this.mrIssueStatusBarItem.hide();
    }

    this.mrStatusBarItem.text = text;
  }

  async initMrStatus() {
    const cmdName = `gl.mrOpener${Date.now()}`;
    commandRegisterHelper(cmdName, () => {
      if (this.mr) {
        openers.openUrl(this.mr.web_url);
      } else {
        openers.openCreateNewMr();
      }
    });

    this.mrStatusBarItem = createStatusBarItem('$(info) GitLab: Finding MR...', cmdName);
    this.mrStatusTimer = setInterval(() => {
      this.fetchBranchMR();
    }, 60000);

    await this.fetchBranchMR();
  }

  initMrIssueStatus() {
    const cmdName = `gl.mrIssueOpener${Date.now()}`;
    commandRegisterHelper(cmdName, () => {
      if (this.issue) {
        openers.openUrl(this.issue.web_url);
      } else {
        vscode.window.showInformationMessage(
          'GitLab Workflow: No closing issue found for this MR.',
        );
      }
    });

    this.mrIssueStatusBarItem = createStatusBarItem(
      '$(info) GitLab: Fetching closing issue...',
      cmdName,
    );
  }

  async init() {
    if (showStatusBarLinks) {
      await this.initPipelineStatus();

      // FIXME: add showMrStatusOnStatusBar to the condition
      // because the initMrStatus() method does all the fetching and initMrIssueStatus
      // only introduces a placeholder item
      if (showIssueLinkOnStatusBar) {
        this.initMrIssueStatus();
      }
      if (showMrStatusOnStatusBar) {
        await this.initMrStatus();
      }
    }
  }

  dispose() {
    if (showStatusBarLinks) {
      this.pipelineStatusBarItem.dispose();

      if (showIssueLinkOnStatusBar) {
        this.mrIssueStatusBarItem.dispose();
      }
      if (showMrStatusOnStatusBar) {
        this.mrStatusBarItem.dispose();
      }
    }

    if (this.pipelinesStatusTimer) {
      clearInterval(this.pipelinesStatusTimer);
      this.pipelinesStatusTimer = null;
    }

    if (this.mrStatusTimer) {
      clearInterval(this.mrStatusTimer);
      this.mrStatusTimer = null;
    }
  }
}

module.exports = {
  StatusBar,
  instance: new StatusBar(),
};
