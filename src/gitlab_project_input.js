const vscode = require('vscode');
const gitLabService = require('./gitlab_service');

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

exports.show = showPicker;
