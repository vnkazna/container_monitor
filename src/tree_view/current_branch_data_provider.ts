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

  private pipelineItem?: PipelineItemModel;

  private mrState?: { mr: RestMr; item: MrItemModel };

  createPipelineItem(
    repository: WrappedRepository,
    pipeline: RestPipeline | undefined,
    jobs: RestJob[],
  ) {
    if (!pipeline) {
      return new vscode.TreeItem('No pipeline found');
    }
    this.pipelineItem = new PipelineItemModel(pipeline, jobs, repository);
    return this.pipelineItem;
  }

  disposeMrItem() {
    this.mrState?.item.dispose();
    this.mrState = undefined;
  }

  createMrItem(mr: RestMr | undefined, repository: WrappedRepository) {
    // TODO soft refresh
    this.disposeMrItem();
    if (!mr) return new vscode.TreeItem('No merge request found');
    const item = new MrItemModel(mr, repository);
    this.mrState = { mr, item };
    return item;
  }

  static createClosingIssueItems(repository: WrappedRepository, issues: RestIssuable[]) {
    if (issues.length === 0) return [new vscode.TreeItem('No closing issue found')];
    return issues.map(issue => new IssueItem(issue, repository.rootFsPath));
  }

  renderValidState(state: ValidBranchState) {
    const pipelineItem = this.createPipelineItem(state.repository, state.pipeline, state.jobs);
    const closingIssuesItems = CurrentBranchDataProvider.createClosingIssueItems(
      state.repository,
      state.issues,
    );
    return { pipelineItem, closingIssuesItems };
  }

  static renderInvalidState(state: InvalidBranchState): vscode.TreeItem[] {
    if (state.error) {
      return [new ErrorItem()];
    }
    return [];
  }

  async getChildren(item: ItemModel | undefined): Promise<(ItemModel | vscode.TreeItem)[]> {
    if (item) return item.getChildren();
    this.pipelineItem?.dispose();
    this.pipelineItem = undefined;
    if (this.state.valid) {
      const mrItem = this.createMrItem(this.state.mr, this.state.repository);
      const { pipelineItem, closingIssuesItems } = this.renderValidState(this.state);
      return [pipelineItem, mrItem, ...closingIssuesItems];
    }
    this.disposeMrItem();
    return CurrentBranchDataProvider.renderInvalidState(this.state);
  }

  // eslint-disable-next-line class-methods-use-this
  getTreeItem(item: ItemModel | vscode.TreeItem) {
    if (item instanceof ItemModel) return item.getTreeItem();
    return item;
  }

  refresh(state: BranchState) {
    this.state = state;
    this.eventEmitter.fire();
  }
}

export const currentBranchDataProvider = new CurrentBranchDataProvider();
