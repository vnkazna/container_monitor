import * as vscode from 'vscode';
import * as gitLabService from '../gitlab_service';
import { ErrorItem } from './items/error_item';
import { handleError } from '../log';
import { ItemModel } from './items/item_model';
import { MrItemModel } from './items/mr_item_model';
import { IssueItem } from './items/issue_item';
import { extensionState } from '../extension_state';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { WrappedRepository } from '../git/wrapped_repository';
import { PipelineItemModel } from './items/pipeline_item_model';

export interface CurrentBranchInfo {
  success: true;
  repository: WrappedRepository;
  mr?: RestMr;
  issues: RestIssuable[];
  pipeline?: RestPipeline;
}

export interface Failure {
  success: false;
  error?: Error;
}

export type BranchState = CurrentBranchInfo | Failure;

const INVALID_STATE: Failure = { success: false };
export class CurrentBranchDataProvider
  implements vscode.TreeDataProvider<ItemModel | vscode.TreeItem> {
  private eventEmitter = new vscode.EventEmitter<void>();

  onDidChangeTreeData = this.eventEmitter.event;

  private state: BranchState = { success: false };

  private disposableChildren: vscode.Disposable[] = [];

  constructor() {
    extensionState.onDidChangeValid(this.refresh, this);
  }

  static createPipelineItem(repository: WrappedRepository, pipeline?: RestPipeline) {
    if (!pipeline) {
      return new vscode.TreeItem('No pipeline found');
    }
    return new PipelineItemModel(pipeline, repository);
  }

  createMrItem(repository: WrappedRepository, mr?: RestMr) {
    if (!mr) {
      return new vscode.TreeItem('No merge request found');
    }
    const item = new MrItemModel(mr, repository);
    this.disposableChildren.push(item);
    return item;
  }

  static createClosingIssueItems(repository: WrappedRepository, issues: RestIssuable[]) {
    if (issues.length === 0) return [new vscode.TreeItem('No closing issue found')];
    return issues.map(issue => new IssueItem(issue, repository.rootFsPath));
  }

  renderSuccess(branchInfo: CurrentBranchInfo): (ItemModel | vscode.TreeItem)[] {
    const pipelineItem = CurrentBranchDataProvider.createPipelineItem(
      branchInfo.repository,
      branchInfo.pipeline,
    );
    const mrItem = this.createMrItem(branchInfo.repository, branchInfo.mr);
    const closingIssuesItems = CurrentBranchDataProvider.createClosingIssueItems(
      branchInfo.repository,
      branchInfo.issues,
    );
    return [pipelineItem, mrItem, ...closingIssuesItems];
  }

  static renderFailure(failure: Failure): vscode.TreeItem[] {
    if (failure.error) {
      handleError(failure.error);
      return [new ErrorItem()];
    }
    return [];
  }

  async getChildren(item: ItemModel | undefined): Promise<(ItemModel | vscode.TreeItem)[]> {
    if (item) return item.getChildren();
    this.disposableChildren.forEach(s => s.dispose());
    this.disposableChildren = [];
    if (this.state.success) {
      return this.renderSuccess(this.state);
    }
    return CurrentBranchDataProvider.renderFailure(this.state);
  }

  // eslint-disable-next-line class-methods-use-this
  getTreeItem(item: ItemModel | vscode.TreeItem) {
    if (item instanceof ItemModel) return item.getTreeItem();
    return item;
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
        return { success: true, repository, pipeline, mr, issues };
      }
      return { success: true, repository, pipeline, mr, issues: [] };
    } catch (e) {
      return { success: false, error: e };
    }
  }

  async refresh() {
    this.state = await CurrentBranchDataProvider.getState();
    this.eventEmitter.fire();
  }
}

export const currentBranchDataProvider = new CurrentBranchDataProvider();
