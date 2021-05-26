const vscode = require('vscode');
const openers = require('../openers');
const gitLabService = require('../gitlab_service');
const { gitExtensionWrapper } = require('../git/git_extension_wrapper');
const { logError } = require('../log');

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

async function showPicker(additionalEntries = [], placeHolder = 'Select a Gitlab Project') {
  const repositoryRootOptions = await gitLabService.getAllGitlabProjects();

  additionalEntries.forEach(additionalEntry => {
    repositoryRootOptions.push(additionalEntry);
  });

  if (repositoryRootOptions.length === 0) {
    return null;
  }
  if (repositoryRootOptions.length === 1) {
    return repositoryRootOptions[0];
  }

  const repositoryRoot = await vscode.window.showQuickPick(repositoryRootOptions, {
    placeHolder,
  });

  if (repositoryRoot) {
    return repositoryRoot.uri;
  }

  return null;
}

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
  let repositoryRoot = null;
  let project = null;

  if (editor) {
    const repository = gitExtensionWrapper.getActiveRepository();
    repositoryRoot = repository && repository.rootFsPath;
    try {
      project = repository && (await repository.getProject());
    } catch (e) {
      logError(e);
    }

    // FIXME: the empty `uri` representing user's snippets is not correctly handled
    if (!project) {
      repositoryRoot = await showPicker(
        [
          {
            label: "User's Snippets",
            uri: '',
          },
        ],
        "Select a Gitlab Project or use the User's Snippets",
      );
      try {
        const selectedRepository = gitExtensionWrapper.getRepository(repositoryRoot);
        project = selectedRepository && (await selectedRepository.getProject());
      } catch (e) {
        logError(e);
      }
    }

    const visibility = await vscode.window.showQuickPick(visibilityOptions);

    if (visibility) {
      const context = await vscode.window.showQuickPick(contextOptions);

      if (context) {
        uploadSnippet(project, editor, visibility.type, context.type, repositoryRoot);
      }
    }
  } else {
    vscode.window.showInformationMessage('GitLab Workflow: No open file.');
  }
}

module.exports = {
  createSnippet,
};
