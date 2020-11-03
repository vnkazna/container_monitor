const { TreeItem, TreeItemCollapsibleState } = require('vscode');
const vscode = require('vscode');
const path = require('path');

class ChangedFileItem extends TreeItem {
  constructor(fileDiff, mr, projectUri, headCommit, baseCommit) {
    super(path.basename(fileDiff.new_path), TreeItemCollapsibleState.None);
    this.description = path.dirname(fileDiff.new_path);
    this.mr = mr;
    this.projectUri = projectUri;
    this.fileDiff = fileDiff;
    const baseFileUri = vscode.Uri.parse(
      `gl-review://authority/${
        fileDiff.old_path
      }?commit=${baseCommit}&workspace=${encodeURIComponent(projectUri)}`,
    );
    const headFileUri = vscode.Uri.parse(
      `gl-review://authority/${
        fileDiff.new_path
      }?commit=${headCommit}&workspace=${encodeURIComponent(projectUri)}`,
    );
    this.command = {
      command: 'vscode.diff',
      // arguments: [vscode.Uri.parse(`gl-review://${fileDiff.new_path}`)],
      arguments: [baseFileUri, headFileUri, path.basename(fileDiff.new_path)],
    };
  }
}

exports.ChangedFileItem = ChangedFileItem;
