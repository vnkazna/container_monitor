const vscode = require('vscode');
const gitLabService = require('./gitlab_service');

async function showPicker(additionalEntries = [], placeHolder = 'Select a Gitlab Project') {
  const workspaceFolderOptions = await gitLabService.getAllGitlabProjects();

  additionalEntries.forEach(additionalEntry => {
    workspaceFolderOptions.push(additionalEntry);
  });

  if (workspaceFolderOptions.length === 0) {
    return null;
  } else if (workspaceFolderOptions.length === 1) {
    return workspaceFolderOptions[0];
  }

  const workspaceFolder = await vscode.window.showQuickPick(workspaceFolderOptions, {
    placeHolder,
  });

  if (workspaceFolder) {
    return workspaceFolder.uri;
  }

  return null;
}

exports.show = showPicker;
