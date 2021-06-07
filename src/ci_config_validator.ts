import * as vscode from 'vscode';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import * as gitLabService from './gitlab_service';

const { showInformationMessage, showErrorMessage } = vscode.window;

export async function validate(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    await showInformationMessage('GitLab Workflow: No open file.');
    return;
  }

  const content = editor.document.getText();
  const response = await gitLabService.validateCIConfig(
    gitExtensionWrapper.getActiveRepository()!.rootFsPath,
    content,
  );

  if (!response) {
    await showInformationMessage('GitLab Workflow: Failed to validate CI configuration.');
    return;
  }

  const { status, errors, error } = response;

  if (status === 'valid') {
    await showInformationMessage('GitLab Workflow: Your CI configuration is valid.');
  } else if (status === 'invalid') {
    if (errors[0]) {
      await showErrorMessage(errors[0]);
    }

    await showErrorMessage('GitLab Workflow: Invalid CI configuration.');
  } else if (error) {
    await showErrorMessage(
      `GitLab Workflow: Failed to validate CI configuration. Reason: ${error}`,
    );
  }
}
