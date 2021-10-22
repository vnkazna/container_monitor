import * as vscode from 'vscode';
import assert from 'assert';
import dayjs from 'dayjs';
import * as gitLabService from './gitlab_service';
import { logError } from './log';
import { extensionState } from './extension_state';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { WrappedRepository } from './git/wrapped_repository';
import { StatusBar } from './status_bar';
import { CurrentBranchDataProvider } from './tree_view/current_branch_data_provider';
import { UserFriendlyError } from './errors/user_friendly_error';

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
    return await gitLabService.fetchJobsForPipeline(repository.rootFsPath, pipeline);
  } catch (e) {
    logError(new UserFriendlyError('Failed to fetch jobs for pipeline.', e));
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

  async init(statusBar: StatusBar, currentBranchProvider: CurrentBranchDataProvider) {
    this.statusBar = statusBar;
    this.currentBranchProvider = currentBranchProvider;
    await this.clearAndSetInterval();
    extensionState.onDidChangeValid(() => this.clearAndSetInterval());
    vscode.window.onDidChangeWindowState(async state => {
      if (!state.focused) {
        return;
      }
      if (dayjs().diff(this.lastRefresh, 'second') > 30) {
        await this.clearAndSetInterval();
      }
    });
    // This polling is not ideal. The alternative is to listen on repository state
    // changes. The logic becomes much more complex and the state changes
    // (Repository.state.onDidChange()) are triggered many times per second.
    // We wouldn't save any CPU cycles, just increased the complexity of this extension.
    this.branchTrackingTimer = setInterval(async () => {
      const currentBranch = gitExtensionWrapper.getActiveRepository()?.branch;
      if (currentBranch && currentBranch !== this.previousBranchName) {
        this.previousBranchName = currentBranch;
        await this.clearAndSetInterval();
      }
    }, 1000);
  }

  async clearAndSetInterval(): Promise<void> {
    global.clearInterval(this.refreshTimer!);
    this.refreshTimer = setInterval(async () => {
      if (!vscode.window.state.focused) return;
      await this.refresh();
    }, 30000);
    await this.refresh();
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
    const repository = gitExtensionWrapper.getActiveRepository();
    if (!repository) return INVALID_STATE;
    const gitlabProject = await repository.getProject();
    if (!gitlabProject) return INVALID_STATE;
    try {
      const { pipeline, mr } = await gitLabService.fetchPipelineAndMrForCurrentBranch(
        repository.rootFsPath,
      );
      const jobs = await getJobs(repository, pipeline);
      const issues = mr ? await gitLabService.fetchMRIssues(mr.iid, repository.rootFsPath) : [];
      return { valid: true, repository, pipeline, mr, jobs, issues, userInitiated };
    } catch (e) {
      logError(e);
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
