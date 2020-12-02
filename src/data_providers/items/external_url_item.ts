import { TreeItem, Uri } from 'vscode';

export class ExternalUrlItem extends TreeItem {
  constructor(label: string, url: string) {
    super(label);
    this.command = {
      title: 'Open URL',
      command: 'vscode.open',
      arguments: [Uri.parse(url)],
    };
  }
}
