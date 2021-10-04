import * as vscode from 'vscode';
import { tokenService } from '../services/token_service';

export async function pickInstance(): Promise<string | undefined> {
  const instanceUrls = tokenService.getInstanceUrls();
  const instanceItems = instanceUrls.map(u => ({
    label: `$(cloud) ${u}`,
    instance: u,
  }));
  if (instanceItems.length === 0) {
    throw new Error('no GitLab instance found');
  }
  let selectedInstanceUrl;
  if (instanceItems.length === 1) {
    [selectedInstanceUrl] = instanceItems;
  } else {
    selectedInstanceUrl = await vscode.window.showQuickPick(instanceItems, {
      ignoreFocusOut: true,
      placeHolder: 'Select GitLab instance',
    });
  }
  if (!selectedInstanceUrl) {
    return undefined;
  }
  return selectedInstanceUrl.instance;
}
