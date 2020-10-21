const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const simpleGit = require('simple-git');
const { insertSnippet } = require('../../src/commands/insert_snippet');
const { tokenService } = require('../../src/services/token_service');
const getServer = require('./test_infrastructure/mock_server');
const { GITLAB_HOST, REMOTE } = require('./test_infrastructure/constants');
const {
  createAndOpenFile,
  closeAndDeleteFile,
  simulateQuickPickChoice,
} = require('./test_infrastructure/helpers');

describe('Insert snippet', async () => {
  let server;
  let testFileUri;
  const sandbox = sinon.createSandbox();

  before(() => {
    server = getServer();
    tokenService.setToken(`https://${GITLAB_HOST}`, 'abcd-secret');
  });

  beforeEach(async () => {
    server.resetHandlers();
    testFileUri = vscode.Uri.parse(`${vscode.workspace.workspaceFolders[0].uri.fsPath}/newfile.js`);
    await createAndOpenFile(testFileUri);
  });

  afterEach(async () => {
    const git = simpleGit(vscode.workspace.workspaceFolders[0].uri.fsPath);
    await git.removeRemote(REMOTE.NAME);
    await git.addRemote(REMOTE.NAME, REMOTE.URL);
    sandbox.restore();
    await closeAndDeleteFile(testFileUri);
  });

  after(() => {
    server.close();
    tokenService.setToken(`https://${GITLAB_HOST}`, undefined);
  });

  it('inserts snippet when there is only one blob', async () => {
    simulateQuickPickChoice(sandbox, 0);
    await insertSnippet();

    assert.strictEqual(vscode.window.activeTextEditor.document.getText(), 'snippet content');
  });

  it('inserts snippet when there are multiple blobs', async () => {
    simulateQuickPickChoice(sandbox, 1);
    await insertSnippet();

    assert.strictEqual(vscode.window.activeTextEditor.document.getText(), 'second blob content');
  });

  it('throws an error when it cannot find GitLab project', async () => {
    const git = simpleGit(vscode.workspace.workspaceFolders[0].uri.fsPath);
    await git.removeRemote(REMOTE.NAME);
    await git.addRemote(REMOTE.NAME, 'git@test.gitlab.com:gitlab-org/nonexistent.git');
    await assert.rejects(insertSnippet(), /Project gitlab-org\/nonexistent was not found./);
  });
});
