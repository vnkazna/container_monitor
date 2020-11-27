const vscode = require('vscode');
const path = require('path');

class SidebarTreeItem extends vscode.TreeItem {
  constructor(title, data = null, type = 'merge_requests', collapsibleState = null, uri) {
    super(title, collapsibleState);

    const { enableExperimentalFeatures } = vscode.workspace.getConfiguration('gitlab');

    let iconPathLight = `/assets/images/light/stop.svg`;
    let iconPathDark = `/assets/images/dark/stop.svg`;
    if (data) {
      let command = 'gl.showRichContent';
      let arg = [data, uri];
      iconPathLight = `/assets/images/light/${type}.svg`;
      iconPathDark = `/assets/images/dark/${type}.svg`;

      if (data == null) {
        command = '';
        arg = null;
      } else if (type === 'pipelines') {
        command = 'vscode.open';
        arg = [vscode.Uri.parse(data)];
      } else if (type === 'vulnerabilities' && data.location) {
        command = 'vscode.open';
        const file = `${vscode.workspace.rootPath}/${data.location.file}`;
        arg = [vscode.Uri.file(file)];
      } else if ((type !== 'issues' && type !== 'merge_requests') || !enableExperimentalFeatures) {
        command = 'vscode.open';
        arg = [vscode.Uri.parse(data.web_url)];
      }

      this.command = {
        command,
        arguments: arg,
      };
    }
    this.iconPath = {
      light: path.join(__dirname, iconPathLight),
      dark: path.join(__dirname, iconPathDark),
    };
  }
}

exports.SidebarTreeItem = SidebarTreeItem;
