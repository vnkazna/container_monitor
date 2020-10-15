import * as vscode from 'vscode';

async function getWorkspaceFolderForOpenEditor(): Promise<string | undefined> {
  const editor = vscode.window.activeTextEditor;
  if (!editor?.document.uri) {
    return undefined;
  }
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
  return workspaceFolder?.uri.fsPath;
}

export async function getCurrentWorkspaceFolder(): Promise<string | null> {
  const editorFolder = await getWorkspaceFolderForOpenEditor();

  if (editorFolder) {
    return editorFolder;
  }

  const { workspaceFolders } = vscode.workspace;
  if (workspaceFolders && workspaceFolders.length === 1) {
    return workspaceFolders[0].uri.fsPath;
  }

  return null;
}

export async function getCurrentWorkspaceFolderOrSelectOne(): Promise<string | null> {
  const editorFolder = await getWorkspaceFolderForOpenEditor();

  if (editorFolder) {
    return editorFolder;
  }

  const { workspaceFolders } = vscode.workspace;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return null;
  }
  if (workspaceFolders.length === 1) {
    return workspaceFolders[0].uri.fsPath;
  }
  const workspaceFolderOptions = workspaceFolders.map(folder => ({
    label: folder.name,
    uri: folder.uri.fsPath,
  }));
  const selectedFolder = await vscode.window.showQuickPick(workspaceFolderOptions, {
    placeHolder: 'Select a workspace',
  });
  if (selectedFolder) {
    return selectedFolder.uri;
  }
  return null;
}
