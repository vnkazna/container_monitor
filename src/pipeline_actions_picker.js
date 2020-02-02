const vscode = require('vscode');
const gitLabService = require('./gitlab_service');
const openers = require('./openers');

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

  const workspaceFolder = await gitLabService.getCurrentWorkspaceFolderOrSelectOne();

  const selected = await vscode.window.showQuickPick(items);

  if (selected) {
    if (selected.action === 'view') {
      openers.openCurrentPipeline(workspaceFolder);
      return;
    }

    gitLabService.handlePipelineAction(selected.action, workspaceFolder);
  }
}

exports.showPicker = showPicker;
