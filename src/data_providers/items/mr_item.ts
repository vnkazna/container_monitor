import { TreeItem, TreeItemCollapsibleState, ThemeIcon, Uri } from 'vscode';
import * as path from 'path';
import { GitLabNewService } from '../../gitlab/gitlab_new_service';
import { createGitService } from '../../git_service_factory';

const getChangeTypeIndicator = (diff: RestDiffFile): string => {
  if (diff.new_file) return '[added] ';
  if (diff.deleted_file) return '[deleted] ';
  if (diff.renamed_file) return '[renamed] ';
  return '';
};

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
    const diff = await gitlabService.getMrDiff(this.mr);
    return diff.map(d => {
      const item = new TreeItem(Uri.file(d.new_path));
      // TODO add FileDecorationProvider once it is available in the 1.53 https://github.com/microsoft/vscode/issues/54938
      item.description = `${getChangeTypeIndicator(d)}${path.dirname(d.new_path)}`;
      return item;
    });
  }
}
