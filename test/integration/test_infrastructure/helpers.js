const vscode = require('vscode');

const createAndOpenFile = async testFileUri => {
  const createFileEdit = new vscode.WorkspaceEdit();
  createFileEdit.createFile(testFileUri);
  await vscode.workspace.applyEdit(createFileEdit);
  await vscode.window.showTextDocument(testFileUri);
};

const closeAndDeleteFile = async testFileUri => {
  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  const edit = new vscode.WorkspaceEdit();
  edit.deleteFile(testFileUri);
  await vscode.workspace.applyEdit(edit);
};

const simulateQuickPickChoice = (sandbox, nthItem) => {
  sandbox.stub(vscode.window, 'showQuickPick').callsFake(async options => {
    return options[nthItem];
  });
};

module.exports = { createAndOpenFile, closeAndDeleteFile, simulateQuickPickChoice };
