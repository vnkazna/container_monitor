import * as vscode from 'vscode';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { log } from '../../log';
import { createGitLabNewService } from '../../service_factory';
import { ChangedFileItem } from './changed_file_item';
import { ItemModel } from './item_model';

export class MrItemModel extends ItemModel {
  constructor(readonly mr: RestIssuable, readonly project: VsProject) {
    super();
  }

  getTreeItem(): vscode.TreeItem {
    const { iid, title, author } = this.mr;
    const item = new vscode.TreeItem(
      `!${iid} · ${title}`,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.iconPath = vscode.Uri.parse(author.avatar_url);
    return item;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const description = new vscode.TreeItem('Description');
    description.iconPath = new vscode.ThemeIcon('note');
    description.command = {
      command: PROGRAMMATIC_COMMANDS.SHOW_RICH_CONTENT,
      arguments: [this.mr, this.project.uri],
      title: 'Show MR',
    };
    const changedFiles = await this.getChangedFiles();
    return [description, ...changedFiles];
  }

  private async getChangedFiles(): Promise<vscode.TreeItem[]> {
    const gitlabService = await createGitLabNewService(this.project.uri);
    const mrVersion = await gitlabService.getMrDiff(this.mr);
    return mrVersion.diffs.map(d => new ChangedFileItem(this.mr, mrVersion, d, this.project));
  }

  dispose(): void {
    log(`MR ${this.mr.title} item model got disposed`);
  }
}
