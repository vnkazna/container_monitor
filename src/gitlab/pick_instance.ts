import * as vscode from 'vscode';
import { accountService } from '../services/account_service';
import { Credentials } from '../services/credentials';

export async function pickInstance(): Promise<Credentials | undefined> {
  const credentials = accountService.getAllCredentials();
  const instanceItems = credentials.map(c => ({
    label: `$(cloud) ${c.instanceUrl}`,
    credentials: c,
  }));
  if (instanceItems.length === 0) {
    throw new Error('no GitLab instance found');
  }
  let selectedCredentials;
  if (instanceItems.length === 1) {
    [selectedCredentials] = instanceItems;
  } else {
    selectedCredentials = await vscode.window.showQuickPick(instanceItems, {
      ignoreFocusOut: true,
      placeHolder: 'Select GitLab instance',
    });
  }
  if (!selectedCredentials) {
    return undefined;
  }
  return selectedCredentials.credentials;
}
