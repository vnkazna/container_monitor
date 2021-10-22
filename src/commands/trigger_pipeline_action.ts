import * as vscode from 'vscode';
import * as gitLabService from '../gitlab_service';
import { openCurrentPipeline } from '../openers';
import { currentBranchRefresher } from '../current_branch_refresher';
import { ProjectCommand } from './run_with_valid_project';

export const triggerPipelineAction: ProjectCommand = async repository => {
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
};
