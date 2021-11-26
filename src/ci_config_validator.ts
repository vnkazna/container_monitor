import * as vscode from 'vscode';
import assert from 'assert';
import { doNotAwait } from './utils/do_not_await';
import { ProjectCommand } from './commands/run_with_valid_project';

export const validate: ProjectCommand = async repository => {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    await vscode.window.showInformationMessage('GitLab Workflow: No open file.');
    return;
  }

  const content = editor.document.getText();
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
};
