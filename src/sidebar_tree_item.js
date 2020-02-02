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

      if (type === 'custom_query' || data == null) {
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

      if (type === 'custom_query' || type === 'project') {
        this.contextValue = 'custom-query-';
        Object.entries(data).forEach(entry => {
          if (Array.isArray(entry[1])) {
            this.contextValue += `${entry[0]}:${entry[1].join(',')};`;
          } else {
            this.contextValue += `${entry[0]}:${entry[1]};`;
          }
        });
        if (type === 'project') {
          this.contextValue += `project_uri:${uri};`;
        }
      } else {
        this.command = {
          command,
          arguments: arg,
        };
      }
    }
    this.iconPath = {
      light: path.join(__dirname, iconPathLight),
      dark: path.join(__dirname, iconPathDark),
    };
  }
}

exports.SidebarTreeItem = SidebarTreeItem;
