import * as vscode from 'vscode';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import * as gitLabService from './gitlab_service';
import { openCurrentPipeline } from './openers';
import { currentBranchRefresher } from './current_branch_refresher';

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
  if (!repository) return;

  const selected = await vscode.window.showQuickPick(items);

  if (selected) {
    if (selected.action === 'view') {
      await openCurrentPipeline(repository.rootFsPath);
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
