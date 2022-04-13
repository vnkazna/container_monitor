import vscode from 'vscode';
import path from 'path';
import { GitRepository } from '../../git/new_git';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';

export class MultipleProjectsItem extends vscode.TreeItem {
  constructor(repository: GitRepository) {
    const folderName = path.basename(repository.rootFsPath);
    super(`${folderName} (multiple projects)`);
    this.iconPath = new vscode.ThemeIcon('warning');
    this.command = {
      command: PROGRAMMATIC_COMMANDS.SELECT_PROJECT,
      title: 'Select Project',
      arguments: [repository],
    };
  }
}
