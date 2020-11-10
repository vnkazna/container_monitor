const { TreeItem, TreeItemCollapsibleState, ThemeIcon, Uri } = require('vscode');
const path = require('path');
const { getReviewUri } = require('../utils/get_review_uri');

class ChangedFileItem extends TreeItem {
  constructor(fileDiff, mr, projectUri, headCommit, baseCommit) {
    super(Uri.parse(fileDiff.new_path), TreeItemCollapsibleState.None);
    this.description = path.dirname(fileDiff.new_path);
    this.mr = mr;
    this.projectUri = projectUri;
    this.fileDiff = fileDiff;
    this.iconPath = ThemeIcon.File;
    const baseFileUri = getReviewUri({
      path: fileDiff.old_path,
      commit: baseCommit,
      workspace: projectUri,
      version: 'base',
    });
    const headFileUri = getReviewUri({
      path: fileDiff.new_path,
      commit: headCommit,
      workspace: projectUri,
      version: 'head',
    });
    this.command = {
      command: 'vscode.diff',
      arguments: [baseFileUri, headFileUri, `${path.basename(fileDiff.new_path)} (MR)`],
    };
  }
}

exports.ChangedFileItem = ChangedFileItem;
