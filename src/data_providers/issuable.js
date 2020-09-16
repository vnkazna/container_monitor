const vscode = require('vscode');
const gitLabService = require('../gitlab_service');
const { SidebarTreeItem } = require('./sidebar_tree_item');
const ErrorItem = require('./error_item');

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
    const items = [];
    const issues = await gitLabService.fetchIssuables(parameters, projectUri);
    let issuableSign = '!';
    if (parameters.type === 'issues') {
      issuableSign = '#';
    } else if (parameters.type === 'epics') {
      issuableSign = '&';
    } else if (parameters.type === 'snippets') {
      issuableSign = '$';
    } else if (parameters.type === 'vulnerabilities') {
      issuableSign = '-';
    }
    if (issues.length) {
      issues.forEach(issue => {
        let title = `${issuableSign}${issue.iid} · ${issue.title}`;
        if (issuableSign === '$') {
          title = `${issuableSign}${issue.id} · ${issue.title}`;
        } else if (issuableSign === '-') {
          title = `[${issue.severity}] - ${issue.name}`;
        }
        items.push(new SidebarTreeItem(title, issue, parameters.type, null, projectUri));
      });
    } else {
      const noItemText = parameters.noItemText || 'No items found.';
      items.push(new SidebarTreeItem(noItemText));
    }
    return items;
  }

  async getChildren(el) {
    try {
      return await this.collectIssuables(el);
    } catch (e) {
      vscode.gitLabWorkflow.handleError(e);
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
