const vscode = require('vscode');
const { SidebarTreeItem } = require('./sidebar_tree_item');
const gitLabService = require('../gitlab_service');
const { handleError } = require('../log');
const ErrorItem = require('./error_item');

const typeToSignMap = {
  issues: '#',
  epics: '&',
  snippets: '$',
  vulnerabilities: '-',
};

class CustomQueryItem extends vscode.TreeItem {
  constructor(customQuery, project, showProject = false) {
    super(
      showProject ? project.label : customQuery.name,
      vscode.TreeItemCollapsibleState.Collapsed,
    );

    this.project = project;
    this.customQuery = customQuery;
    this.iconPath = showProject ? new vscode.ThemeIcon('project') : new vscode.ThemeIcon('filter');
  }

  async getProjectIssues() {
    const items = [];
    const issues = await gitLabService.fetchIssuables(this.customQuery, this.project.uri);
    const issuableSign = typeToSignMap[this.customQuery.type] || '!';
    if (issues.length) {
      issues.forEach(issue => {
        let title = `${issuableSign}${issue.iid} · ${issue.title}`;
        if (issuableSign === '$') {
          title = `${issuableSign}${issue.id} · ${issue.title}`;
        } else if (issuableSign === '-') {
          title = `[${issue.severity}] - ${issue.name}`;
        }
        items.push(
          new SidebarTreeItem(title, issue, this.customQuery.type, null, this.project.uri),
        );
      });
    } else {
      const noItemText = this.customQuery.noItemText || 'No items found.';
      items.push(new SidebarTreeItem(noItemText));
    }
    return items;
  }

  async getChildren() {
    try {
      return this.getProjectIssues();
    } catch (e) {
      handleError(e);
      return [new ErrorItem()];
    }
  }
}

exports.CustomQueryItem = CustomQueryItem;
