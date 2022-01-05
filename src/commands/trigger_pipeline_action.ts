import * as vscode from 'vscode';
import { openCurrentPipeline } from '../openers';
import { ProjectCommand } from './run_with_valid_project';
import { USER_COMMANDS } from '../command_names';

type PipelineAction = 'view' | 'create' | 'retry' | 'cancel';

export const triggerPipelineAction: ProjectCommand = async repository => {
  const items: { label: string; action: PipelineAction }[] = [
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

    const project = await repository.getProject();
    const gitlabService = repository.getGitLabService();
    const { pipeline } = await gitlabService.getPipelineAndMrForCurrentBranch(
      project,
      await repository.getTrackingBranchName(),
    );

    if (selected.action === 'create') {
      const branchName = await repository.getTrackingBranchName();
      const result = await gitlabService.createPipeline(branchName, project);
      if (result) await vscode.commands.executeCommand(USER_COMMANDS.REFRESH_SIDEBAR);
      return;
    }
    if (pipeline) {
      const result = await gitlabService.cancelOrRetryPipeline(selected.action, project, pipeline);
      if (result) await vscode.commands.executeCommand(USER_COMMANDS.REFRESH_SIDEBAR);
      return;
    }
    await vscode.window.showErrorMessage('GitLab Workflow: No project or pipeline found.');
  }
};
