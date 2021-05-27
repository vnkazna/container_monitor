/* eslint-disable no-unused-expressions */
import * as vscode from 'vscode';
import * as openers from './openers';
import * as gitLabService from './gitlab_service';
import { UserFriendlyError } from './errors/user_friendly_error';
import { log, logError } from './log';
import { USER_COMMANDS } from './command_names';
import { gitExtensionWrapper } from './git/git_extension_wrapper';

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
  arguments: [vscode.Uri.parse(issuable.web_url)],
});

export class StatusBar {
  pipelineStatusBarItem?: vscode.StatusBarItem;

  refreshTimer?: NodeJS.Timeout;

  mrStatusBarItem?: vscode.StatusBarItem;

  mrIssueStatusBarItem?: vscode.StatusBarItem;

  firstRun = true;

  async refresh() {
    const repository = gitExtensionWrapper.getActiveRepository();
    if (!repository) return;

    const project = await repository.getProject();
    if (!project) {
      log(
        'GitLab project not found, the extension is going to hide the status bar until next refresh in 30s.',
      );
      this.hideAllItems();
      return;
    }
    const { mr, pipeline } = await gitLabService.fetchPipelineAndMrForCurrentBranch(
      repository.rootFsPath,
    );
    await this.updatePipelineItem(pipeline, repository.rootFsPath);
    this.updateMrItem(mr);
    await this.fetchMrClosingIssue(mr, repository.rootFsPath);
  }

  hideAllItems(): void {
    this.pipelineStatusBarItem?.hide();
    this.mrStatusBarItem?.hide();
    this.mrIssueStatusBarItem?.hide();
  }

  async updatePipelineItem(pipeline: RestPipeline | null, repositoryRoot: string): Promise<void> {
    if (!this.pipelineStatusBarItem) return;
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
        const jobs = await gitLabService.fetchLastJobsForCurrentBranch(repositoryRoot, pipeline);
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

      await vscode.window
        .showInformationMessage(message, { modal: false }, 'View in Gitlab')
        .then(async selection => {
          if (selection === 'View in Gitlab') {
            await openers.openCurrentPipeline(repositoryRoot);
          }
        });
    }

    this.pipelineStatusBarItem.text = msg;
    this.pipelineStatusBarItem.show();
    this.firstRun = false;
  }

  async fetchMrClosingIssue(mr: RestIssuable | null, repositoryRoot: string): Promise<void> {
    if (!this.mrIssueStatusBarItem) return;
    if (mr) {
      const issues = await gitLabService.fetchMRIssues(mr.iid, repositoryRoot);
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

  updateMrItem(mr: RestIssuable | null): void {
    if (!this.mrStatusBarItem) return;
    this.mrStatusBarItem.show();
    this.mrStatusBarItem.command = mr
      ? openIssuableOnTheWebCommand(mr)
      : USER_COMMANDS.OPEN_CREATE_NEW_MR;
    this.mrStatusBarItem.text = mr
      ? `$(git-pull-request) GitLab: MR !${mr.iid}`
      : '$(git-pull-request) GitLab: Create MR.';
  }

  async init() {
    if (showStatusBarLinks) {
      this.pipelineStatusBarItem = createStatusBarItem(
        '$(info) GitLab: Fetching pipeline...',
        USER_COMMANDS.PIPELINE_ACTIONS,
      );
      if (showMrStatusOnStatusBar) {
        this.mrStatusBarItem = createStatusBarItem('$(info) GitLab: Finding MR...');
        if (showIssueLinkOnStatusBar) {
          this.mrIssueStatusBarItem = createStatusBarItem(
            '$(info) GitLab: Fetching closing issue...',
          );
        }
      }
      await this.refresh();
      this.refreshTimer = setInterval(async () => {
        if (!vscode.window.state.focused) return;
        await this.refresh();
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
