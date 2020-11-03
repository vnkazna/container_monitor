const vscode = require('vscode');
const gitLabService = require('../gitlab_service');
const { SidebarTreeItem } = require('./sidebar_tree_item');
const { MrItem } = require('./mr_item');
const ErrorItem = require('./error_item');
const { handleError } = require('../log');

const getSign = type => {
  switch (type) {
    case 'issues':
      return '#';
    case 'epics':
      return '&';
    case 'snippets':
      return '$';
    case 'vulnerabilities':
      return '-';
    default:
      return '!';
  }
};

class DataProvider {
  constructor() {
    // Temporarily disable eslint to be able to start enforcing stricter rules
    // eslint-disable-next-line no-underscore-dangle
    this._onDidChangeTreeData = new vscode.EventEmitter();
    // Temporarily disable eslint to be able to start enforcing stricter rules
    // eslint-disable-next-line no-underscore-dangle
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  // eslint-disable-next-line class-methods-use-this
  async getProjectIssues(parameters, projectUri) {
    const issues = await gitLabService.fetchIssuables(parameters, projectUri);
    const issuableSign = getSign(parameters.type);
    if (issues.length) {
      if (parameters.type === 'merge_requests') {
        return issues.map(i => new MrItem(i, projectUri));
      }
      return issues.map(issue => {
        let title = `${issuableSign}${issue.iid} · ${issue.title}`;
        if (issuableSign === '$') {
          title = `${issuableSign}${issue.id} · ${issue.title}`;
        } else if (issuableSign === '-') {
          title = `[${issue.severity}] - ${issue.name}`;
        }
        return new SidebarTreeItem(title, issue, parameters.type, true, projectUri);
      });
    }
    const noItemText = parameters.noItemText || 'No items found.';
    return [new SidebarTreeItem(noItemText)];
  }

  async getChildren(el) {
    try {
      if (el && el.getChildren) {
        return await el.getChildren();
      }
      return await this.collectIssuables(el);
    } catch (e) {
      handleError(e);
      return [new ErrorItem()];
    }
  }

  async collectIssuables(el) {
    const { customQueries } = vscode.workspace.getConfiguration('gitlab');

    const projects = await gitLabService.getAllGitlabProjects();

    let items = [];
    if (el) {
      if (el.contextValue && el.contextValue.startsWith('custom-query-')) {
        const customQuery = el.contextValue.split('custom-query-')[1];
        const parameters = {};
        customQuery.split(';').forEach(cq => {
          const key = cq.split(':')[0];
          const value = cq.split(':')[1];
          parameters[key] = value;
        });
        if (parameters.project_uri) {
          items = await this.getProjectIssues(parameters, parameters.project_uri);
        } else if (projects.length > 1) {
          projects.forEach(project => {
            items.push(
              new SidebarTreeItem(
                project.label,
                parameters,
                'project',
                vscode.TreeItemCollapsibleState.Collapsed,
                project.uri,
              ),
            );
          });
        } else if (projects.length === 1) {
          items = await this.getProjectIssues(parameters, projects[0].uri);
        } else {
          items.push(new SidebarTreeItem(parameters.noItemText));
        }
      }
    } else {
      customQueries.forEach(customQuery => {
        items.push(
          new SidebarTreeItem(
            customQuery.name,
            customQuery,
            'custom_query',
            vscode.TreeItemCollapsibleState.Collapsed,
            null,
          ),
        );
      });
    }
    return items;
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
