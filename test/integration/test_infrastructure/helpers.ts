import * as vscode from 'vscode';
import * as assert from 'assert';
import { SinonSandbox } from 'sinon';
import { GitExtension } from '../../../src/api/git';

export const createAndOpenFile = async (testFileUri: vscode.Uri): Promise<void> => {
  const createFileEdit = new vscode.WorkspaceEdit();
  createFileEdit.createFile(testFileUri);
  await vscode.workspace.applyEdit(createFileEdit);
  await vscode.window.showTextDocument(testFileUri);
};

export const closeAndDeleteFile = async (testFileUri: vscode.Uri): Promise<void> => {
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  const edit = new vscode.WorkspaceEdit();
  edit.deleteFile(testFileUri);
  await vscode.workspace.applyEdit(edit);
};

export const simulateQuickPickChoice = (sandbox: SinonSandbox, nthItem: number): void => {
  sandbox.stub(vscode.window, 'showQuickPick').callsFake(async options => {
    return (await options)[nthItem];
  });
};

export const getRepositoryRoot = (): string => {
  const folders = vscode.workspace.workspaceFolders;
  const folder = folders && folders[0]?.uri.fsPath;
  assert(folder, 'There is no workspace folder in the test VS Code instance');
  return folder;
};

export const updateRepositoryStatus = async (): Promise<void> => {
  const api = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports.getAPI(1);
  assert(api, 'Failed to retrieve Git Extension');
  return api.getRepository(vscode.Uri.file(getRepositoryRoot()))?.status();
};
