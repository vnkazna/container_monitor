const { TreeItem, TreeItemCollapsibleState } = require('vscode');
const path = require('path');
const { getReviewUri } = require('../utils/get_review_uri');

class ChangedFileItem extends TreeItem {
  constructor(fileDiff, mr, projectUri, headCommit, baseCommit) {
    super(path.basename(fileDiff.new_path), TreeItemCollapsibleState.None);
    this.description = path.dirname(fileDiff.new_path);
    this.mr = mr;
    this.projectUri = projectUri;
    this.fileDiff = fileDiff;
    const baseFileUri = getReviewUri({
      path: fileDiff.old_path,
      commit: baseCommit,
      workspace: projectUri,
    });
    const headFileUri = getReviewUri({
      path: fileDiff.new_path,
      commit: headCommit,
      workspace: projectUri,
    });
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
