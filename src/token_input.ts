import vscode from 'vscode';
import { GITLAB_COM_URL } from './constants';
import { tokenService } from './services/token_service';

export async function showInput() {
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

export async function removeTokenPicker() {
  const instanceUrls = tokenService.getRemovableInstanceUrls();
  const selectedInstanceUrl = await vscode.window.showQuickPick(instanceUrls, {
    ignoreFocusOut: true,
    placeHolder: 'Select Gitlab instance for PAT removal',
  });

  if (selectedInstanceUrl) {
    await tokenService.setToken(selectedInstanceUrl, undefined);
  }
}
