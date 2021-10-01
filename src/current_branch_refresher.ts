import * as vscode from 'vscode';
import * as assert from 'assert';
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
  refreshTimer?: NodeJS.Timeout;

  private statusBar?: StatusBar;

  private currentBranchProvider?: CurrentBranchDataProvider;

  init(statusBar: StatusBar, currentBranchProvider: CurrentBranchDataProvider) {
    this.statusBar = statusBar;
    this.currentBranchProvider = currentBranchProvider;
    this.refreshTimer = setInterval(async () => {
      if (!vscode.window.state.focused) return;
      await this.refresh();
    }, 30000);
    extensionState.onDidChangeValid(() => this.refresh());
  }

  async refresh() {
    assert(this.statusBar);
    assert(this.currentBranchProvider);
    const state = await CurrentBranchRefresher.getState();
    await this.statusBar.refresh(state);
    this.currentBranchProvider.refresh(state);
  }

  static async getState(): Promise<BranchState> {
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
      return { valid: true, repository, pipeline, mr, jobs, issues };
    } catch (e) {
      logError(e);
      return { valid: false, error: e };
    }
  }

  dispose() {
    global.clearInterval(this.refreshTimer!);
  }
}

export const currentBranchRefresher = new CurrentBranchRefresher();
