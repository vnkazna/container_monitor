import * as vscode from 'vscode';
import assert from 'assert';
import dayjs from 'dayjs';
import { log } from './log';
import { extensionState } from './extension_state';
import { WrappedRepository } from './git/wrapped_repository';
import { StatusBar } from './status_bar';
import { CurrentBranchDataProvider } from './tree_view/current_branch_data_provider';
import { UserFriendlyError } from './errors/user_friendly_error';
import { notNullOrUndefined } from './utils/not_null_or_undefined';
import { getActiveRepository } from './commands/run_with_valid_project';

export interface ValidBranchState {
  valid: true;
  repository: WrappedRepository;
  mr?: RestMr;
  issues: RestIssuable[];
  pipeline?: RestPipeline;
  jobs: RestJob[];
  userInitiated: boolean;
}

export interface InvalidBranchState {
  valid: false;
  error?: Error;
}

export type BranchState = ValidBranchState | InvalidBranchState;

const INVALID_STATE: InvalidBranchState = { valid: false };

const getJobs = async (
  repository: WrappedRepository,
  pipeline?: RestPipeline,
): Promise<RestJob[]> => {
  if (!pipeline) return [];
  try {
    return await repository.getGitLabService().getJobsForPipeline(pipeline);
  } catch (e) {
    log.error(new UserFriendlyError('Failed to fetch jobs for pipeline.', e));
    return [];
  }
};
export class CurrentBranchRefresher {
  private refreshTimer?: NodeJS.Timeout;

  private branchTrackingTimer?: NodeJS.Timeout;

  private statusBar?: StatusBar;

  private currentBranchProvider?: CurrentBranchDataProvider;

  private lastRefresh = dayjs().subtract(1, 'minute');

  private previousBranchName = '';

  init(statusBar: StatusBar, currentBranchProvider: CurrentBranchDataProvider) {
    this.statusBar = statusBar;
    this.currentBranchProvider = currentBranchProvider;
    this.clearAndSetInterval();
    extensionState.onDidChangeValid(() => this.clearAndSetIntervalAndRefresh());
    vscode.window.onDidChangeWindowState(async state => {
      if (!state.focused) {
        return;
      }
      if (dayjs().diff(this.lastRefresh, 'second') > 30) {
        await this.clearAndSetIntervalAndRefresh();
      }
    });
    // This polling is not ideal. The alternative is to listen on repository state
    // changes. The logic becomes much more complex and the state changes
    // (Repository.state.onDidChange()) are triggered many times per second.
    // We wouldn't save any CPU cycles, just increased the complexity of this extension.
    this.branchTrackingTimer = setInterval(async () => {
      const currentBranch = getActiveRepository()?.branch;
      if (currentBranch && currentBranch !== this.previousBranchName) {
        this.previousBranchName = currentBranch;
        await this.clearAndSetIntervalAndRefresh();
      }
    }, 1000);
  }

  async clearAndSetIntervalAndRefresh(): Promise<void> {
    await this.clearAndSetInterval();
    await this.refresh();
  }

  clearAndSetInterval(): void {
    global.clearInterval(this.refreshTimer!);
    this.refreshTimer = setInterval(async () => {
      if (!vscode.window.state.focused) return;
      await this.refresh();
    }, 30000);
  }

  async refresh(userInitiated = false) {
    assert(this.statusBar);
    assert(this.currentBranchProvider);
    const state = await CurrentBranchRefresher.getState(userInitiated);
    await this.statusBar.refresh(state);
    this.currentBranchProvider.refresh(state);
    this.lastRefresh = dayjs();
  }

  static async getState(userInitiated: boolean): Promise<BranchState> {
    if (!extensionState.isValid()) return INVALID_STATE;
    const repository = getActiveRepository();
    if (!repository) return INVALID_STATE;
    const gitlabProject = await repository.getProject();
    if (!gitlabProject) return INVALID_STATE;
    const gitLabService = repository.getGitLabService();
    try {
      const { pipeline, mr } = await gitLabService.getPipelineAndMrForCurrentBranch(
        gitlabProject,
        await repository.getTrackingBranchName(),
      );
      const jobs = await getJobs(repository, pipeline);
      const minimalIssues = mr ? await gitLabService.getMrClosingIssues(gitlabProject, mr.iid) : [];
      const issues = (
        await Promise.all(
          minimalIssues.map(mi => gitLabService.getSingleProjectIssue(gitlabProject, mi.iid)),
        )
      ).filter(notNullOrUndefined);
      return { valid: true, repository, pipeline, mr, jobs, issues, userInitiated };
    } catch (e) {
      log.error(e);
      return { valid: false, error: e };
    }
  }

  stopTimers(): void {
    global.clearInterval(this.refreshTimer!);
    global.clearInterval(this.branchTrackingTimer!);
  }

  dispose() {
    this.stopTimers();
  }
}

export const currentBranchRefresher = new CurrentBranchRefresher();
