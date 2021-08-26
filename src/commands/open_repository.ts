import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitLabRemoteFileSystem } from '../remotefs/gitlab_remote_file_system';

export type OpenAction = 'replace' | 'new-window' | 'add-root';

async function openUrl(uri: vscode.Uri, action: OpenAction) {
  await GitLabRemoteFileSystem.parseUri(uri); // ensure the URI is a valid gitlab-remote URI

  switch (action) {
    case 'replace':
      await vscode.commands.executeCommand('vscode.openFolder', uri, false);
      break;

    case 'new-window':
      await vscode.commands.executeCommand('vscode.openFolder', uri, true);
      break;

    case 'add-root':
      vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, {
        uri,
      });
      break;

    default:
      throw new Error('Invalid action');
  }
}

export async function openRepository(): Promise<void> {
  const r = await vscode.window.showQuickPick<{ label: string; id: OpenAction }>([
    { id: 'replace', label: 'Open in current window' },
    { id: 'new-window', label: 'Open in new window' },
    { id: 'add-root', label: 'Add to workspace' },
  ]);
  if (!r) return;
  const openAction: OpenAction = r.id;

  const uriStr = await vscode.window.showInputBox({
    prompt: 'gitlab-remote://{instance}/{label}?project={id}&ref={branch}',
    ignoreFocusOut: true,
  });
  if (!uriStr) return;

  let uri: vscode.Uri;
  try {
    uri = vscode.Uri.parse(uriStr);
  } catch (error) {
    await vscode.window.showErrorMessage(`Invalid URL: ${uriStr}`);
    return;
  }

  try {
    await openUrl(uri, openAction);
  } catch (error) {
    if (!(error instanceof assert.AssertionError)) throw error;

    await vscode.window.showErrorMessage(error.message);
  }
}
