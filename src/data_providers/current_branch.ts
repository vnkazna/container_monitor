import * as vscode from 'vscode';
import * as dayjs from 'dayjs';
import * as relativeTime from 'dayjs/plugin/relativeTime';
import * as gitLabService from '../gitlab_service';
import { ErrorItem } from './items/error_item';
import { getCurrentWorkspaceFolder } from '../services/workspace_service';
import { handleError, logError } from '../log';
import { ItemModel } from './items/item_model';
import { MrItemModel } from './items/mr_item_model';
import { IssueItem } from './items/issue_item';
import { ExternalUrlItem } from './items/external_url_item';
import { GitLabProject } from '../gitlab/gitlab_project';

dayjs.extend(relativeTime);

class DataProvider implements vscode.TreeDataProvider<ItemModel | vscode.TreeItem> {
  private eventEmitter = new vscode.EventEmitter<void>();

  onDidChangeTreeData = this.eventEmitter.event;

  private mr: RestIssuable | null = null;

  private disposableChildren: vscode.Disposable[] = [];

  // eslint-disable-next-line class-methods-use-this
  async fetchPipeline(workspaceFolder: string, project: GitLabProject) {
    let pipeline;
    try {
      pipeline = await gitLabService.fetchLastPipelineForCurrentBranch(workspaceFolder);
    } catch (e) {
      logError(e);
      return new ErrorItem('Fetching pipeline failed');
    }

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

  async fetchMR(workspaceFolder: string, project: VsProject) {
    let mr;
    try {
      mr = await gitLabService.fetchOpenMergeRequestForCurrentBranch(workspaceFolder);
    } catch (e) {
      logError(e);
      return new ErrorItem('Fetching MR failed');
    }
    if (mr) {
      this.mr = mr;
      const item = new MrItemModel(mr, project);
      this.disposableChildren.push(item);
      return item;
    }
    return new vscode.TreeItem('No merge request found');
  }

  async fetchClosingIssue(workspaceFolder: string, project: VsProject) {
    if (this.mr) {
      const issues = await gitLabService.fetchMRIssues(this.mr.iid, workspaceFolder);

      if (issues.length) {
        return issues.map(issue => new IssueItem(issue, project));
      }
    }
    return [new vscode.TreeItem('No closing issue found')];
  }

  async getChildren(item: ItemModel | undefined): Promise<ItemModel[] | vscode.TreeItem[]> {
    if (item) return item.getChildren();
    this.disposableChildren.forEach(s => s.dispose());
    this.disposableChildren = [];
    const workspaceFolder = await getCurrentWorkspaceFolder();
    if (!workspaceFolder) {
      return [];
    }
    try {
      const gitlabProject = await gitLabService.fetchCurrentProject(workspaceFolder);
      if (!gitlabProject) {
        return [];
      }
      const vsProject = {
        label: gitlabProject.name,
        uri: workspaceFolder,
      };
      const pipelineItem = await this.fetchPipeline(workspaceFolder, gitlabProject);
      const mrItem = await this.fetchMR(workspaceFolder, vsProject);
      const closingIssuesItems = await this.fetchClosingIssue(workspaceFolder, vsProject);
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
