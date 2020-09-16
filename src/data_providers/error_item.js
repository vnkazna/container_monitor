const { TreeItem, ThemeIcon } = require('vscode');

class ErrorItem extends TreeItem {
  constructor(message = 'Error occurred, please try to refresh.') {
    super(message);
    this.iconPath = new ThemeIcon('error');
  }
}

module.exports = ErrorItem;
