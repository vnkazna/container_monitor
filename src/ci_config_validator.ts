import * as vscode from 'vscode';
import assert from 'assert';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { doNotAwait } from './utils/do_not_await';

export async function validate(): Promise<void> {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    await vscode.window.showInformationMessage('GitLab Workflow: No open file.');
    return;
  }

  const content = editor.document.getText();
  const repository = gitExtensionWrapper.getActiveRepository();
  assert(repository);
  const project = await repository.getProject();
  assert(project, "Current folder doesn't contain a GitLab project");
  const { valid, errors } = await repository.getGitLabService().validateCIConfig(project, content);

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
