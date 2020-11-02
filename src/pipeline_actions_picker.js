const vscode = require('vscode');
const gitLabService = require('./gitlab_service');
const openers = require('./openers');
const statusBar = require('./status_bar');
const { getCurrentWorkspaceFolderOrSelectOne } = require('./services/workspace_service');

async function showPicker() {
  const items = [
    {
      label: 'View latest pipeline on GitLab',
      action: 'view',
    },
    {
      label: 'Create a new pipeline from current branch',
      action: 'create',
    },
    {
      label: 'Retry last pipeline',
      action: 'retry',
    },
    {
      label: 'Cancel last pipeline',
      action: 'cancel',
    },
  ];

  const workspaceFolder = await getCurrentWorkspaceFolderOrSelectOne();

  const selected = await vscode.window.showQuickPick(items);

  if (selected) {
    if (selected.action === 'view') {
      openers.openCurrentPipeline(workspaceFolder);
      return;
    }

    const newPipeline = await gitLabService.handlePipelineAction(selected.action, workspaceFolder);
    if (newPipeline) statusBar.refreshPipeline();
  }
}

exports.showPicker = showPicker;
