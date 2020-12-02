const vscode = require('vscode');
const { CustomQueryItem } = require('./custom_query_item');

class MultirootCustomQueryItem extends vscode.TreeItem {
  constructor(customQuery, projects) {
    super(customQuery.name, vscode.TreeItemCollapsibleState.Collapsed);

    this.customQuery = customQuery;
    this.projects = projects;

    this.iconPath = new vscode.ThemeIcon('filter');
  }

  async getChildren() {
    return this.projects.map(p => new CustomQueryItem(this.customQuery, p, true));
  }
}

exports.MultirootCustomQueryItem = MultirootCustomQueryItem;
