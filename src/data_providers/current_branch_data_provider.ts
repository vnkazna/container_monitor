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

export class CurrentBranchDataProvider
  implements vscode.TreeDataProvider<ItemModel | vscode.TreeItem> {
  private eventEmitter = new vscode.EventEmitter<void>();

  onDidChangeTreeData = this.eventEmitter.event;

  private mr: RestMr | null = null;

  private disposableChildren: vscode.Disposable[] = [];

  constructor() {
    extensionState.onDidChangeValid(this.refresh, this);
  }

  // eslint-disable-next-line class-methods-use-this
  async createPipelineItem(pipeline: RestPipeline | null, repository: WrappedRepository) {
    if (!pipeline) {
      return new vscode.TreeItem('No pipeline found');
    }
    return new PipelineItemModel(pipeline, repository);
  }

  async createMrItem(mr: RestMr | null, repository: WrappedRepository) {
    if (!mr) {
      return new vscode.TreeItem('No merge request found');
    }
    this.mr = mr;
    const item = new MrItemModel(mr, repository);
    this.disposableChildren.push(item);
    return item;
  }

  async fetchClosingIssue(repository: WrappedRepository) {
    if (this.mr) {
      const issues = await gitLabService.fetchMRIssues(this.mr.iid, repository.rootFsPath);

      if (issues.length) {
        return issues.map(issue => new IssueItem(issue, repository.rootFsPath));
      }
    }
    return [new vscode.TreeItem('No closing issue found')];
  }

  async getChildren(item: ItemModel | undefined): Promise<ItemModel[] | vscode.TreeItem[]> {
    if (item) return item.getChildren();
    this.disposableChildren.forEach(s => s.dispose());
    this.disposableChildren = [];
    const repository = gitExtensionWrapper.getActiveRepository();
    if (!extensionState.isValid() || !repository) {
      return [];
    }
    try {
      const gitlabProject = await repository.getProject();
      if (!gitlabProject) {
        return [];
      }
      const { pipeline, mr } = await gitLabService.fetchPipelineAndMrForCurrentBranch(
        repository.rootFsPath,
      );
      const pipelineItem = await this.createPipelineItem(pipeline, repository);
      const mrItem = await this.createMrItem(mr, repository);
      const closingIssuesItems = await this.fetchClosingIssue(repository);
      return [pipelineItem, mrItem, ...closingIssuesItems] as vscode.TreeItem[]; // TODO the actual type includes ItemMode
    } catch (e) {
      handleError(e);
      return [new ErrorItem()];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getTreeItem(item: ItemModel | vscode.TreeItem) {
    if (item instanceof ItemModel) return item.getTreeItem();
    return item;
  }

  refresh() {
    this.eventEmitter.fire();
  }
}

export const currentBranchDataProvider = new CurrentBranchDataProvider();
