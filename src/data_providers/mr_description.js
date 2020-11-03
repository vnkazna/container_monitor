const { TreeItem, ThemeIcon, TreeItemCollapsibleState } = require('vscode');

class MrDescription extends TreeItem {
  constructor(mr, projectUri) {
    super('Description', TreeItemCollapsibleState.None);

    this.iconPath = new ThemeIcon('note');

    this.command = {
      command: 'gl.showRichContent',
      arguments: [mr, projectUri],
    };
  }
}

exports.MrDescription = MrDescription;
