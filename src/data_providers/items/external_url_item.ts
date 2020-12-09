import { TreeItem, Uri } from 'vscode';
import { VS_COMMANDS } from '../../command_names';

export class ExternalUrlItem extends TreeItem {
  constructor(label: string, url: string) {
    super(label);
    this.command = {
      title: 'Open URL',
      command: VS_COMMANDS.OPEN,
      arguments: [Uri.parse(url)],
    };
  }
}
