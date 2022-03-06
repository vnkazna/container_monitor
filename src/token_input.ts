import vscode from 'vscode';
import { GITLAB_COM_URL } from './constants';
import { tokenService } from './services/token_service';

export const validateInstanceUrl = (input: string): string | undefined => {
  if (!/^https?:\/\/.*$/.test(input)) return 'Must begin with http:// or https://';
  try {
    // eslint-disable-next-line no-new
    new URL(input);
  } catch (e) {
    return 'Must be a valid URL';
  }
  return undefined;
};

export async function showInput() {
  const instance = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    value: GITLAB_COM_URL,
    placeHolder: 'E.g. https://gitlab.com',
    prompt: 'URL to Gitlab instance',
    validateInput: validateInstanceUrl,
  });

  if (!instance) return;

  const token = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    password: true,
    placeHolder: 'Paste your GitLab Personal Access Token...',
  });

  if (!token) return;

  await tokenService.setToken(instance, token);
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
