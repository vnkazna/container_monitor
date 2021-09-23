import * as vscode from 'vscode';
import { ErrorItem } from './items/error_item';
import { ItemModel } from './items/item_model';
import { MrItemModel } from './items/mr_item_model';
import { IssueItem } from './items/issue_item';
import { WrappedRepository } from '../git/wrapped_repository';
import { PipelineItemModel } from './items/pipeline_item_model';
import { BranchState, ValidBranchState, InvalidBranchState } from '../current_branch_refresher';

export class CurrentBranchDataProvider
  implements vscode.TreeDataProvider<ItemModel | vscode.TreeItem> {
  private eventEmitter = new vscode.EventEmitter<void>();

  onDidChangeTreeData = this.eventEmitter.event;

  private state: BranchState = { valid: false };

  private disposableChildren: vscode.Disposable[] = [];

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

  renderValidState(state: ValidBranchState): (ItemModel | vscode.TreeItem)[] {
    const pipelineItem = CurrentBranchDataProvider.createPipelineItem(
      state.repository,
      state.pipeline,
    );
    const mrItem = this.createMrItem(state.repository, state.mr);
    const closingIssuesItems = CurrentBranchDataProvider.createClosingIssueItems(
      state.repository,
      state.issues,
    );
    return [pipelineItem, mrItem, ...closingIssuesItems];
  }

  static renderInvalidState(state: InvalidBranchState): vscode.TreeItem[] {
    if (state.error) {
      return [new ErrorItem()];
    }
    return [];
  }

  async getChildren(item: ItemModel | undefined): Promise<(ItemModel | vscode.TreeItem)[]> {
    if (item) return item.getChildren();
    this.disposableChildren.forEach(s => s.dispose());
    this.disposableChildren = [];
    if (this.state.valid) {
      return this.renderValidState(this.state);
    }
    return CurrentBranchDataProvider.renderInvalidState(this.state);
  }

  // eslint-disable-next-line class-methods-use-this
  getTreeItem(item: ItemModel | vscode.TreeItem) {
    if (item instanceof ItemModel) return item.getTreeItem();
    return item;
  }

  async refresh(state: BranchState) {
    this.state = state;
    this.eventEmitter.fire();
  }
}

export const currentBranchDataProvider = new CurrentBranchDataProvider();
