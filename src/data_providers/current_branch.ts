import * as vscode from 'vscode';
import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import * as gitLabService from '../gitlab_service';
import { ErrorItem } from './items/error_item';
import { handleError } from '../log';
import { ItemModel } from './items/item_model';
import { MrItemModel } from './items/mr_item_model';
import { IssueItem } from './items/issue_item';
import { ExternalUrlItem } from './items/external_url_item';
import { GitLabProject } from '../gitlab/gitlab_project';
import { extensionState } from '../extension_state';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { WrappedRepository } from '../git/wrapped_repository';

dayjs.extend(relativeTime);

class DataProvider implements vscode.TreeDataProvider<ItemModel | vscode.TreeItem> {
  private eventEmitter = new vscode.EventEmitter<void>();

  onDidChangeTreeData = this.eventEmitter.event;

  private mr: RestIssuable | null = null;

  private disposableChildren: vscode.Disposable[] = [];

  constructor() {
    extensionState.onDidChangeValid(this.refresh, this);
  }

  // eslint-disable-next-line class-methods-use-this
  async createPipelineItem(pipeline: RestPipeline | null, project: GitLabProject) {
    if (!pipeline) {
      return new vscode.TreeItem('No pipeline found');
    }
    const statusText = pipeline.status === 'success' ? 'passed' : pipeline.status;
    const actions = {
      running: 'Started',
      pending: 'Created',
      success: 'Finished',
      failed: 'Failed',
      canceled: 'Canceled',
      skipped: 'Skipped',
    };
    const timeAgo = dayjs(pipeline.updated_at).fromNow();
    const actionText = actions[pipeline.status] || '';

    const message = `Pipeline #${pipeline.id} ${statusText} · ${actionText} ${timeAgo}`;
    const url = `${project.webUrl}/pipelines/${pipeline.id}`;

    return new ExternalUrlItem(message, url);
  }

  async createMrItem(mr: RestIssuable | null, repository: WrappedRepository) {
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
      const pipelineItem = await this.createPipelineItem(pipeline, gitlabProject);
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

exports.DataProvider = DataProvider;
