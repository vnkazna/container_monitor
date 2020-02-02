const vscode = require('vscode');
const gitLabService = require('../gitlab_service');
const { SidebarTreeItem } = require('../sidebar_tree_item');

class DataProvider {
  constructor() {
    this._onDidChangeTreeData = new vscode.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }

  async getProjectIssues(parameters, project_uri) {
    const items = [];
    parameters.noItemText = parameters.noItemText ? parameters.noItemText : 'No items found.';
    const issues = await gitLabService.fetchIssuables(parameters, project_uri);
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
        items.push(new SidebarTreeItem(title, issue, parameters.type, null, project_uri));
      });
    } else {
      items.push(new SidebarTreeItem(parameters.noItemText));
    }
    return items;
  }

  async getChildren(el) {
    let items = [];
    const { customQueries } = vscode.workspace.getConfiguration('gitlab');
    const projects = await gitLabService.getAllGitlabProjects();

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

  getParent() {
    return null;
  }

  getTreeItem(item) {
    return item;
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}

exports.DataProvider = DataProvider;
