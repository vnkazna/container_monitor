const vscode = require('vscode');
const openers = require('../openers');
const gitLabService = require('../gitlab_service');
const { gitExtensionWrapper } = require('../git/git_extension_wrapper');

const visibilityOptions = [
  {
    label: 'Public',
    type: 'public',
  },
  {
    label: 'Internal',
    type: 'internal',
  },
  {
    label: 'Private',
    type: 'private',
  },
];

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

async function uploadSnippet(project, editor, visibility, context, repositoryRoot) {
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
  };

  data.content = content;

  if (project) {
    data.id = project.restId;
  }

  const snippet = await gitLabService.createSnippet(repositoryRoot, data);

  openers.openUrl(snippet.web_url);
}

async function createSnippet() {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    vscode.window.showInformationMessage('GitLab Workflow: No open file.');
    return;
  }
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  const project = repository && (await repository.getProject());

  if (!project) {
    vscode.window.showInformationMessage(
      'GitLab Workflow: Repository does not contain GitLab project.',
    );
    return;
  }

  const visibility = await vscode.window.showQuickPick(visibilityOptions);
  if (!visibility) return;

  const context = await vscode.window.showQuickPick(contextOptions);
  if (!context) return;

  uploadSnippet(project, editor, visibility.type, context.type, repository.rootFsPath);
}

module.exports = {
  createSnippet,
};
