const vscode = require('vscode');
const moment = require('moment');
const gitLabService = require('../gitlab_service');
const { ErrorItem } = require('./items/error_item');
const { getCurrentWorkspaceFolder } = require('../services/workspace_service');
const { handleError } = require('../log');
const { MrItem } = require('./items/mr_item');
const { IssueItem } = require('./items/issue_item');
const { ExternalUrlItem } = require('./items/external_url_item');

class DataProvider {
  constructor() {
    // Temporarily disable eslint to be able to start enforcing stricter rules
    // eslint-disable-next-line no-underscore-dangle
    this._onDidChangeTreeData = new vscode.EventEmitter();
    // Temporarily disable eslint to be able to start enforcing stricter rules
    // eslint-disable-next-line no-underscore-dangle
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;

    this.project = null;
    this.mr = null;
  }

  async fetchPipeline(workspaceFolder) {
    const pipeline = await gitLabService.fetchLastPipelineForCurrentBranch(workspaceFolder);

    if (!pipeline) {
      return new vscode.TreeItem('No pipeline found.');
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
    const timeAgo = moment(pipeline.updated_at).fromNow();
    const actionText = actions[pipeline.status] || '';

    const message = `Pipeline #${pipeline.id} ${statusText} · ${actionText} ${timeAgo}`;
    const url = `${this.project.web_url}/pipelines/${pipeline.id}`;

    return new ExternalUrlItem(message, url);
  }

  async fetchMR(workspaceFolder) {
    const mr = await gitLabService.fetchOpenMergeRequestForCurrentBranch(workspaceFolder);

    if (mr) {
      this.mr = mr;
      return new MrItem(this.mr, this.project);
    }
    return new vscode.TreeItem('No merge request found.');
  }

  async fetchClosingIssue(workspaceFolder) {
    if (this.mr) {
      const issues = await gitLabService.fetchMRIssues(this.mr.iid, workspaceFolder);

      if (issues.length) {
        return issues.map(issue => new IssueItem(issue, this.project));
      }
    }
    return [new vscode.TreeItem('No closing issue found.')];
  }

  async getChildren(item) {
    if (item) return item.getChildren();
    try {
      const workspaceFolder = await getCurrentWorkspaceFolder();
      this.project = await gitLabService.fetchCurrentProject(workspaceFolder);
      const pipelineItem = await this.fetchPipeline(workspaceFolder);
      const mrItem = await this.fetchMR(workspaceFolder);
      const closingIssuesItems = await this.fetchClosingIssue(workspaceFolder);
      return [pipelineItem, mrItem, ...closingIssuesItems];
    } catch (e) {
      handleError(e);
      return [new ErrorItem()];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  getParent() {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  getTreeItem(item) {
    return item;
  }

  refresh() {
    // Temporarily disable eslint to be able to start enforcing stricter rules
    // eslint-disable-next-line no-underscore-dangle
    this._onDidChangeTreeData.fire();
  }
}

exports.DataProvider = DataProvider;
