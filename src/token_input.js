const vscode = require('vscode');
const { GITLAB_COM_URL } = require('./constants');
const { tokenService } = require('./services/token_service');

async function showInput() {
  const instance = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    value: GITLAB_COM_URL,
    placeHolder: 'E.g. https://gitlab.com',
    prompt: 'URL to Gitlab instance',
  });

  const token = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    password: true,
    placeHolder: 'Paste your GitLab Personal Access Token...',
  });

  if (instance && token) {
    await tokenService.setToken(instance, token);
  }
}

async function removeTokenPicker() {
  const instanceUrls = tokenService.getInstanceUrls();
  const selectedInstanceUrl = await vscode.window.showQuickPick(instanceUrls, {
    ignoreFocusOut: true,
    placeHolder: 'Select Gitlab instance for PAT removal',
  });

  if (selectedInstanceUrl) {
    await tokenService.setToken(selectedInstanceUrl, undefined);
  }
}

exports.showInput = showInput;
exports.removeTokenPicker = removeTokenPicker;
