const { TreeItem, TreeItemCollapsibleState } = require('vscode');
const vscode = require('vscode');
const path = require('path');
const { REVIEW_URI_SCHEME } = require('../constants');

class ChangedFileItem extends TreeItem {
  constructor(fileDiff, mr, projectUri, headCommit, baseCommit) {
    super(path.basename(fileDiff.new_path), TreeItemCollapsibleState.None);
    this.description = path.dirname(fileDiff.new_path);
    this.mr = mr;
    this.projectUri = projectUri;
    this.fileDiff = fileDiff;
    const baseFileUri = vscode.Uri.parse(
      `${REVIEW_URI_SCHEME}://authority/${
        fileDiff.old_path
      }?commit=${baseCommit}&workspace=${encodeURIComponent(projectUri)}`,
    );
    const headFileUri = vscode.Uri.parse(
      `${REVIEW_URI_SCHEME}://authority/${
        fileDiff.new_path
      }?commit=${headCommit}&workspace=${encodeURIComponent(projectUri)}`,
    );
    // const headFileUri = new vscode.Uri(
    //   REVIEW_URI_SCHEME,
    //   `authority`,
    //   `/${fileDiff.new_path}`,
    //   `commit=${headCommit}&workspace=${encodeURIComponent(projectUri)}`,
    //   '',
    // );
    this.command = {
      command: 'vscode.diff',
      arguments: [baseFileUri, headFileUri, path.basename(fileDiff.new_path)],
    };
  }
}

exports.ChangedFileItem = ChangedFileItem;
