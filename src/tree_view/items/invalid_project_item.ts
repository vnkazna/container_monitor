import { TreeItem, ThemeIcon } from 'vscode';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { WrappedRepository } from '../../git/wrapped_repository';

export class InvalidProjectItem extends TreeItem {
  constructor(repository: WrappedRepository) {
    super(`${repository.name}: failed to load, click to retry.`);
    this.iconPath = new ThemeIcon('error');
    this.command = {
      command: PROGRAMMATIC_COMMANDS.DIAGNOSE_REPOSITORY,
      arguments: [repository],
      title: 'Diagnose Repository',
    };
  }
}
