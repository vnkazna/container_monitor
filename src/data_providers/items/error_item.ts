import { TreeItem, ThemeIcon } from 'vscode';

export class ErrorItem extends TreeItem {
  constructor(message = 'Error occurred, please try to refresh.') {
    super(message);
    this.iconPath = new ThemeIcon('error');
  }
}
