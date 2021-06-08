import * as vscode from 'vscode';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import * as gitLabService from './gitlab_service';

export async function validate(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    await vscode.window.showInformationMessage('GitLab Workflow: No open file.');
    return;
  }

  const content = editor.document.getText();
  const response = await gitLabService.validateCIConfig(
    gitExtensionWrapper.getActiveRepository()!.rootFsPath,
    content,
  );

  if (!response) {
    await vscode.window.showInformationMessage(
      'GitLab Workflow: Failed to validate CI configuration.',
    );
    return;
  }

  const { status, errors, error } = response;

  if (status === 'valid') {
    await vscode.window.showInformationMessage('GitLab Workflow: Your CI configuration is valid.');
  } else if (status === 'invalid') {
    if (errors[0]) {
      await vscode.window.showErrorMessage(errors[0]);
    }

    await vscode.window.showErrorMessage('GitLab Workflow: Invalid CI configuration.');
  } else if (error) {
    await vscode.window.showErrorMessage(
      `GitLab Workflow: Failed to validate CI configuration. Reason: ${error}`,
    );
  }
}
