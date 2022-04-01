import * as vscode from 'vscode';
import * as openers from '../openers';
import { GitLabProject } from '../gitlab/gitlab_project';
import { ProjectCommand } from './run_with_valid_project';
import { WrappedGitLabProject } from '../git/wrapped_repository';

type VisibilityItem = vscode.QuickPickItem & { type: SnippetVisibility };

const PRIVATE_VISIBILITY_ITEM: VisibilityItem = {
  label: '$(lock) Private',
  type: 'private',
  description: 'The snippet is visible only to project members.',
};

const PUBLIC_VISIBILITY_ITEM: VisibilityItem = {
  label: '$(globe) Public',
  type: 'public',
  description: 'The snippet can be accessed without any authentication.',
};

export const VISIBILITY_OPTIONS = [PRIVATE_VISIBILITY_ITEM, PUBLIC_VISIBILITY_ITEM];

const contextOptions = [
  {
    label: 'Snippet from file',
    type: 'file',
  },
  {
    label: 'Snippet from selection',
    type: 'selection',
  },
];

async function uploadSnippet(
  project: GitLabProject,
  editor: vscode.TextEditor,
  visibility: SnippetVisibility,
  context: string,
  repository: WrappedGitLabProject,
) {
  let content = '';
  const fileName = editor.document.fileName.split('/').reverse()[0];

  if (context === 'selection' && editor.selection) {
    const { start, end } = editor.selection;
    const endLine = end.line + 1;
    const startPos = new vscode.Position(start.line, 0);
    const endPos = new vscode.Position(endLine, 0);
    const range = new vscode.Range(startPos, endPos);
    content = editor.document.getText(range);
  } else {
    content = editor.document.getText();
  }

  const data = {
    title: fileName,
    file_name: fileName,
    visibility,
    content,
  };

  const snippet = await repository.getGitLabService().createSnippet(project, data);

  await openers.openUrl(snippet.web_url);
}

export const createSnippet: ProjectCommand = async repository => {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    await vscode.window.showInformationMessage('GitLab Workflow: No open file.');
    return;
  }
  const project = await repository.getProject();

  const visibility = await vscode.window.showQuickPick(VISIBILITY_OPTIONS);
  if (!visibility) return;

  const context = await vscode.window.showQuickPick(contextOptions);
  if (!context) return;

  await uploadSnippet(project, editor, visibility.type, context.type, repository);
};
