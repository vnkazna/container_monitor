import * as vscode from 'vscode';
import * as gitLabService from './gitlab_service';
import { logError } from './log';
import { extensionState } from './extension_state';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { WrappedRepository } from './git/wrapped_repository';
import { statusBar } from './status_bar';
import { currentBranchDataProvider } from './tree_view/current_branch_data_provider';

export interface ValidBranchState {
  valid: true;
  repository: WrappedRepository;
  mr?: RestMr;
  issues: RestIssuable[];
  pipeline?: RestPipeline;
}

export interface InvalidBranchState {
  valid: false;
  error?: Error;
}

export type BranchState = ValidBranchState | InvalidBranchState;

const INVALID_STATE: InvalidBranchState = { valid: false };

export class CurrentBranchRefresher {
  refreshTimer?: NodeJS.Timeout;

  init() {
    this.refreshTimer = setInterval(async () => {
      if (!vscode.window.state.focused) return;
      await CurrentBranchRefresher.refresh();
    }, 30000);
    extensionState.onDidChangeValid(CurrentBranchRefresher.refresh);
  }

  static async refresh() {
    const state = await CurrentBranchRefresher.getState();
    await statusBar.refresh(state);
    await currentBranchDataProvider.refresh(state);
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
      if (mr) {
        const issues = await gitLabService.fetchMRIssues(mr.iid, repository.rootFsPath);
        return { valid: true, repository, pipeline, mr, issues };
      }
      return { valid: true, repository, pipeline, mr, issues: [] };
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
