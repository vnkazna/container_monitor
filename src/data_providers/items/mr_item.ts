import { TreeItem, TreeItemCollapsibleState, ThemeIcon } from 'vscode';
import { GitLabNewService } from '../../gitlab/gitlab_new_service';
import { createGitService } from '../../git_service_factory';
import { ChangedFileItem } from './changed_file_item';

export class MrItem extends TreeItem {
  mr: RestIssuable;

  project: VsProject;

  constructor(mr: RestIssuable, project: VsProject) {
    super(`!${mr.iid} · ${mr.title}`, TreeItemCollapsibleState.Collapsed);
    this.mr = mr;
    this.project = project;
  }

  async getChildren(): Promise<TreeItem[]> {
    const description = new TreeItem('Description');
    description.iconPath = new ThemeIcon('note');
    description.command = {
      command: 'gl.showRichContent',
      arguments: [this.mr, this.project.uri],
      title: 'Show MR',
    };
    const changedFiles = await this.getChangedFiles();
    return [description, ...changedFiles];
  }

  private async getChangedFiles(): Promise<TreeItem[]> {
    const gitService = createGitService(this.project.uri);
    const instanceUrl = await gitService.fetchCurrentInstanceUrl();
    const gitlabService = new GitLabNewService(instanceUrl);
    const mrVersion = await gitlabService.getMrDiff(this.mr);
    return mrVersion.diffs.map(d => new ChangedFileItem(this.mr, mrVersion, d, this.project));
  }
}
