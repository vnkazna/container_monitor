const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const simpleGit = require('simple-git');
const { graphql } = require('msw');
const { insertSnippet } = require('../../src/commands/insert_snippet');
const { tokenService } = require('../../src/services/token_service');
const snippetsResponse = require('./fixtures/graphql/snippets.json');
const { getServer, createTextEndpoint } = require('./test_infrastructure/mock_server');
const { GITLAB_URL, REMOTE } = require('./test_infrastructure/constants');
const {
  createAndOpenFile,
  closeAndDeleteFile,
  simulateQuickPickChoice,
  getRepositoryRoot,
} = require('./test_infrastructure/helpers');

describe('Insert snippet', async () => {
  let server;
  let testFileUri;
  const sandbox = sinon.createSandbox();

  before(async () => {
    server = getServer([
      createTextEndpoint(
        '/projects/278964/snippets/111/files/master/test.js/raw',
        'snippet content',
      ),
      createTextEndpoint(
        '/projects/278964/snippets/222/files/master/test2.js/raw',
        'second blob content',
      ),
      graphql.query('GetSnippets', (req, res, ctx) => {
        if (req.variables.projectPath === 'gitlab-org/gitlab')
          return res(ctx.data(snippetsResponse));
        return res(ctx.data({ project: null }));
      }),
    ]);
    await tokenService.setToken(GITLAB_URL, 'abcd-secret');
  });

  beforeEach(async () => {
    server.resetHandlers();
    testFileUri = vscode.Uri.parse(`${getRepositoryRoot()}/newfile.js`);
    await createAndOpenFile(testFileUri);
  });

  afterEach(async () => {
    const git = simpleGit(getRepositoryRoot());
    await git.removeRemote(REMOTE.NAME);
    await git.addRemote(REMOTE.NAME, REMOTE.URL);
    sandbox.restore();
    await closeAndDeleteFile(testFileUri);
  });

  after(async () => {
    server.close();
    await tokenService.setToken(GITLAB_URL, undefined);
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
    const git = simpleGit(getRepositoryRoot());
    await git.removeRemote(REMOTE.NAME);
    await git.addRemote(REMOTE.NAME, 'git@test.gitlab.com:gitlab-org/nonexistent.git');
    await assert.rejects(insertSnippet(), /Project gitlab-org\/nonexistent was not found./);
  });
});
