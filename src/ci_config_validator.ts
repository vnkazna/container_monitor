import * as vscode from 'vscode';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import * as gitLabService from './gitlab_service';
import { doNotAwait } from './utils/do_not_await';

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

  const { valid, errors } = response;

  if (valid) {
    doNotAwait(
      vscode.window.showInformationMessage('GitLab Workflow: Your CI configuration is valid.'),
    );
    return;
  }
  doNotAwait(vscode.window.showErrorMessage('GitLab Workflow: Invalid CI configuration.'));
  if (errors[0]) {
    doNotAwait(vscode.window.showErrorMessage(errors[0]));
  }
}
