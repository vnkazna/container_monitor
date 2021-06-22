import * as vscode from 'vscode';
import * as assert from 'assert';
import { MrItemModel } from '../data_providers/items/mr_item_model';
import { VS_COMMANDS } from '../command_names';
import { doNotAwait } from '../utils/do_not_await';

const handleGitError = async (e: { stderr: string }) => {
  const SEE_GIT_LOG = 'See Git Log';
  const choice = await vscode.window.showErrorMessage(`Checkout failed: ${e.stderr}`, SEE_GIT_LOG);
  if (choice === SEE_GIT_LOG) {
    await vscode.commands.executeCommand(VS_COMMANDS.GIT_SHOW_OUTPUT);
  }
};
/**
 * Command will checkout source branch for merge request. Merge request must be from local branch.
 */
export const checkoutMrBranch = async (mrItemModel: MrItemModel): Promise<void> => {
  const { mr } = mrItemModel;
  assert(
    mr.target_project_id === mr.source_project_id,
    'this command is only available for same-project MRs',
  );
  try {
    const { repository } = mrItemModel;
    doNotAwait(vscode.window.showInformationMessage('Fetching branches...'));
    await repository.fetch();
    await repository.checkout(mr.source_branch);
    if (repository.lastCommitSha !== mr.sha) {
      await vscode.window.showWarningMessage(
        `Branch changed to ${mr.source_branch}, but it's out of sync with the remote branch. Synchronize it by pushing or pulling.`,
      );
      return;
    }
    await vscode.window.showInformationMessage(`Branch changed to ${mr.source_branch}`);
  } catch (e) {
    if (e.gitErrorCode) {
      await handleGitError(e);
      return;
    }
    throw e;
  }
};
