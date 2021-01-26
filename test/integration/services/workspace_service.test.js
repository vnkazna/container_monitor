const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const workspaceService = require('../../../src/services/workspace_service');
const {
  createAndOpenFile,
  closeAndDeleteFile,
  simulateQuickPickChoice,
} = require('../test_infrastructure/helpers');

describe('workspace_service', () => {
  const sandbox = sinon.createSandbox();

  describe('one workspace, no open files', () => {
    it('getCurrentWorkspaceFolder returns workspace folder', async () => {
      const result = await workspaceService.getCurrentWorkspaceFolder();
      assert.strictEqual(result, vscode.workspace.workspaceFolders[0].uri.fsPath);
    });

    it('getCurrentWorkspaceFolderOrSelectOne returns workspace folder', async () => {
      const result = await workspaceService.getCurrentWorkspaceFolderOrSelectOne();
      assert.strictEqual(result, vscode.workspace.workspaceFolders[0].uri.fsPath);
    });
  });

  describe('multiple workspaces', () => {
    const fakeFolders = [
      {
        name: 'workspace 1',
        uri: { fsPath: '/ws1' },
      },
      {
        name: 'workspace 2',
        uri: { fsPath: '/ws2' },
      },
    ];

    let originalWorkspace;

    before(() => {
      [originalWorkspace] = vscode.workspace.workspaceFolders;
      sandbox.stub(vscode.workspace, 'workspaceFolders').get(() => fakeFolders);
    });

    after(() => {
      sandbox.restore();
    });

    it('getCurrentWorkspaceFolder returns undefined', async () => {
      const result = await workspaceService.getCurrentWorkspaceFolder();
      assert.strictEqual(result, undefined);
    });

    it('getCurrentWorkspaceFolderOrSelectOne lets user select a workspace', async () => {
      // simulating user selecting second option
      simulateQuickPickChoice(sandbox, 1);
      const result = await workspaceService.getCurrentWorkspaceFolderOrSelectOne();
      assert.strictEqual(result, '/ws2');
    });

    describe('with open editor', () => {
      let testFileUri;
      beforeEach(async () => {
        testFileUri = vscode.Uri.parse(`${originalWorkspace.uri.fsPath}/newfile.js`);
        await createAndOpenFile(testFileUri);
      });

      afterEach(async () => {
        await closeAndDeleteFile(testFileUri);
      });

      it('getCurrentWorkspaceFolder returns workspace folder', async () => {
        const result = await workspaceService.getCurrentWorkspaceFolder();
        assert.strictEqual(result, originalWorkspace.uri.fsPath);
      });

      it('getCurrentWorkspaceFolderOrSelectOne returns workspace folder', async () => {
        const result = await workspaceService.getCurrentWorkspaceFolderOrSelectOne();
        assert.strictEqual(result, originalWorkspace.uri.fsPath);
      });
    });
  });
});
