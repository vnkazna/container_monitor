const vscode = require('vscode');
const { gitExtensionWrapper } = require('./git/git_extension_wrapper');
const gitLabService = require('./gitlab_service');
const openers = require('./openers');
const { currentBranchRefresher } = require('./current_branch_refresher');

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

  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();

  const selected = await vscode.window.showQuickPick(items);

  if (selected) {
    if (selected.action === 'view') {
      openers.openCurrentPipeline(repository.rootFsPath);
      return;
    }

    const newPipeline = await gitLabService.handlePipelineAction(
      selected.action,
      repository.rootFsPath,
    );
    if (newPipeline) await currentBranchRefresher.refresh();
  }
}

exports.showPicker = showPicker;
