import * as vscode from 'vscode';
import { SinonSandbox } from 'sinon';

export const createAndOpenFile = async (testFileUri: vscode.Uri) => {
  const createFileEdit = new vscode.WorkspaceEdit();
  createFileEdit.createFile(testFileUri);
  await vscode.workspace.applyEdit(createFileEdit);
  await vscode.window.showTextDocument(testFileUri);
};

export const closeAndDeleteFile = async (testFileUri: vscode.Uri) => {
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  const edit = new vscode.WorkspaceEdit();
  edit.deleteFile(testFileUri);
  await vscode.workspace.applyEdit(edit);
};

export const simulateQuickPickChoice = (sandbox: SinonSandbox, nthItem: number) => {
  sandbox.stub(vscode.window, 'showQuickPick').callsFake(async options => {
    return (await options)[nthItem];
  });
};

export const getWorkspaceFolder = () => {
  const folders = vscode.workspace.workspaceFolders;
  return folders && folders[0]?.uri.fsPath;
};
