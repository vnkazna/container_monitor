import { TreeItem, TreeItemCollapsibleState, ThemeIcon, Uri } from 'vscode';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { createGitLabNewService } from '../../service_factory';
import { ChangedFileItem } from './changed_file_item';

export class MrItem extends TreeItem {
  mr: RestIssuable;

  project: VsProject;

  constructor(mr: RestIssuable, project: VsProject) {
    super(`!${mr.iid} · ${mr.title}`, TreeItemCollapsibleState.Collapsed);
    this.mr = mr;
    this.project = project;
    this.iconPath = Uri.parse(mr.author.avatar_url);
  }

  async getChildren(): Promise<TreeItem[]> {
    const description = new TreeItem('Description');
    description.iconPath = new ThemeIcon('note');
    description.command = {
      command: PROGRAMMATIC_COMMANDS.SHOW_RICH_CONTENT,
      arguments: [this.mr, this.project.uri],
      title: 'Show MR',
    };
    const changedFiles = await this.getChangedFiles();
    return [description, ...changedFiles];
  }

  private async getChangedFiles(): Promise<TreeItem[]> {
    const gitlabService = await createGitLabNewService(this.project.uri);
    const mrVersion = await gitlabService.getMrDiff(this.mr);
    return mrVersion.diffs.map(d => new ChangedFileItem(this.mr, mrVersion, d, this.project));
  }
}
