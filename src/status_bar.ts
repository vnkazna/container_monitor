/* eslint-disable no-unused-expressions */
import * as vscode from 'vscode';
import * as openers from './openers';
import * as gitLabService from './gitlab_service';
import { getCurrentWorkspaceFolder } from './services/workspace_service';
import { UserFriendlyError } from './errors/user_friendly_error';
import { logError } from './log';
import { USER_COMMANDS } from './command_names';

const MAXIMUM_DISPLAYED_JOBS = 4;

// FIXME: if you are touching this configuration statement, move the configuration to get_extension_configuration.ts
const {
  showStatusBarLinks,
  showIssueLinkOnStatusBar,
  showMrStatusOnStatusBar,
  showPipelineUpdateNotifications,
} = vscode.workspace.getConfiguration('gitlab');

const iconForStatus: Record<string, { icon: string; text?: string } | undefined> = {
  running: { icon: 'pulse' },
  pending: { icon: 'clock' },
  success: { icon: 'check', text: 'passed' },
  failed: { icon: 'x' },
  canceled: { icon: 'circle-slash' },
  skipped: { icon: 'diff-renamed' },
};

const getStatusText = (status: string) => iconForStatus[status]?.text || status;

const createStatusTextFromJobs = (jobs: gitLabService.RestJob[], status: string) => {
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

const createStatusBarItem = (text: string, command?: string | vscode.Command) => {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarItem.text = text;
  statusBarItem.show();

  if (command) {
    statusBarItem.command = command;
  }

  return statusBarItem;
};

const openIssuableOnTheWebCommand = (issuable: RestIssuable): vscode.Command => ({
  title: '', // the title is not used for StatusBarItem commands
  command: 'vscode.open',
  arguments: [issuable.web_url],
});

export class StatusBar {
  pipelineStatusBarItem?: vscode.StatusBarItem;

  refreshTimer?: NodeJS.Timeout;

  mrStatusBarItem?: vscode.StatusBarItem;

  mrIssueStatusBarItem?: vscode.StatusBarItem;

  firstRun = true;

  async refresh() {
    if (!this.pipelineStatusBarItem) return;
    let workspaceFolder: string | undefined;
    let pipeline = null;

    try {
      workspaceFolder = await getCurrentWorkspaceFolder();
      if (!workspaceFolder) return;
      const result = await gitLabService.fetchPipelineAndMrForCurrentBranch(workspaceFolder);
      const mr = result.mr ?? undefined;
      this.updateMrItem(mr);
      await this.fetchMrClosingIssue(mr, workspaceFolder);
      pipeline = result.pipeline;
    } catch (e) {
      logError(e);
      this.pipelineStatusBarItem.hide();
      return;
    }
    if (!pipeline) {
      this.pipelineStatusBarItem.text = 'GitLab: No pipeline.';
      this.pipelineStatusBarItem.show();
      this.firstRun = false;
      return;
    }
    const { status } = pipeline;
    let statusText = getStatusText(status);

    if (status === 'running' || status === 'failed') {
      try {
        const jobs = await gitLabService.fetchLastJobsForCurrentBranch(pipeline);
        if (jobs) {
          statusText = createStatusTextFromJobs(jobs, status);
        }
      } catch (e) {
        logError(new UserFriendlyError('Failed to fetch jobs for pipeline.', e));
      }
    }

    const msg = `$(${iconForStatus[status]?.icon}) GitLab: Pipeline ${statusText}`;

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
            openers.openCurrentPipeline(workspaceFolder!);
          }
        });
    }

    this.pipelineStatusBarItem.text = msg;
    this.pipelineStatusBarItem.show();
    this.firstRun = false;
  }

  async initPipelineStatus() {
    this.pipelineStatusBarItem = createStatusBarItem(
      '$(info) GitLab: Fetching pipeline...',
      USER_COMMANDS.PIPELINE_ACTIONS,
    );
  }

  async fetchMrClosingIssue(mr: RestIssuable | undefined, workspaceFolder: string): Promise<void> {
    if (!this.mrIssueStatusBarItem) return;
    if (mr) {
      const issues = await gitLabService.fetchMRIssues(mr.iid, workspaceFolder);
      let text = `$(code) GitLab: No issue.`;
      let command;

      const firstIssue = issues[0];
      if (firstIssue) {
        text = `$(code) GitLab: Issue #${firstIssue.iid}`;
        command = openIssuableOnTheWebCommand(firstIssue);
      }

      this.mrIssueStatusBarItem.text = text;
      this.mrIssueStatusBarItem.command = command;
    } else {
      this.mrIssueStatusBarItem.hide();
    }
  }

  updateMrItem(mr: RestIssuable | undefined): void {
    if (!this.mrStatusBarItem) return;
    this.mrStatusBarItem.show();
    this.mrStatusBarItem.command = mr
      ? openIssuableOnTheWebCommand(mr)
      : USER_COMMANDS.OPEN_CREATE_NEW_MR;
    this.mrStatusBarItem.text = mr
      ? `$(git-pull-request) GitLab: MR !${mr.iid}`
      : '$(git-pull-request) GitLab: Create MR.';
  }

  initMrStatus() {
    this.mrStatusBarItem = createStatusBarItem('$(info) GitLab: Finding MR...');
  }

  async init() {
    if (showStatusBarLinks) {
      await this.initPipelineStatus();
      if (showMrStatusOnStatusBar) {
        this.initMrStatus();
        if (showIssueLinkOnStatusBar) {
          this.mrIssueStatusBarItem = createStatusBarItem(
            '$(info) GitLab: Fetching closing issue...',
          );
        }
      }
      await this.refresh();
      this.refreshTimer = setInterval(() => {
        if (!vscode.window.state.focused) return;
        this.refresh();
      }, 30000);
    }
  }

  dispose() {
    if (showStatusBarLinks) {
      this.pipelineStatusBarItem?.dispose();

      if (showIssueLinkOnStatusBar) {
        this.mrIssueStatusBarItem?.dispose();
      }
      if (showMrStatusOnStatusBar) {
        this.mrStatusBarItem?.dispose();
      }
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }
}

export const instance = new StatusBar();
