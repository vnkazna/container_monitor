const { TreeItem, TreeItemCollapsibleState } = require('vscode');
const { GitLabNewService } = require('../gitlab/gitlab_new_service');
const { createGitService } = require('../git_service_factory');
const { MrDescription } = require('./mr_description');
const { ChangedFileItem } = require('./changed_file_item');

class MrItem extends TreeItem {
  constructor(mr, projectUri) {
    super(`!${mr.iid} · ${mr.title}`, TreeItemCollapsibleState.Collapsed);
    this.mr = mr;
    this.projectUri = projectUri;
  }

  async getChildren() {
    const instanceUrl = await createGitService(this.projectUri).fetchCurrentInstanceUrl();
    const diff = await new GitLabNewService(instanceUrl).getMrDiff(this.mr);
    const files = diff.diffs.map(
      d =>
        new ChangedFileItem(
          d,
          this.mr,
          this.projectUri,
          diff.head_commit_sha,
          diff.base_commit_sha,
          this.projectUri,
        ),
    ); // TODO maybe use start_commit_sha?
    return [new MrDescription(this.mr, this.projectUri), ...files];
  }
}

exports.MrItem = MrItem;
