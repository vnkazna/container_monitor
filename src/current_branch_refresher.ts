import * as vscode from 'vscode';
import * as assert from 'assert';
import * as gitLabService from './gitlab_service';
import { logError } from './log';
import { extensionState } from './extension_state';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { WrappedRepository } from './git/wrapped_repository';
import { StatusBar } from './status_bar';
import { CurrentBranchDataProvider } from './tree_view/current_branch_data_provider';

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
    await this.currentBranchProvider.refresh(state);
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
