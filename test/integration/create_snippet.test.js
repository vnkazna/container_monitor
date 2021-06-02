const sinon = require('sinon');
const vscode = require('vscode');
const { createSnippet } = require('../../src/commands/create_snippet');
const { tokenService } = require('../../src/services/token_service');
const { getServer, createPostEndpoint } = require('./test_infrastructure/mock_server');
const { GITLAB_URL } = require('./test_infrastructure/constants');
const {
  createAndOpenFile,
  closeAndDeleteFile,
  simulateQuickPickChoice,
  getRepositoryRoot,
} = require('./test_infrastructure/helpers');

describe('Create snippet', async () => {
  let server;
  let testFileUri;
  const sandbox = sinon.createSandbox();
  const snippetUrl = `${GITLAB_URL}/gitlab-org/gitlab/snippets/1`;

  before(async () => {
    server = getServer([
      createPostEndpoint('/projects/278964/snippets', {
        web_url: snippetUrl,
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
    sandbox.restore();
    await closeAndDeleteFile(testFileUri);
  });

  after(async () => {
    server.close();
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  it('creates snippet form the file', async () => {
    simulateQuickPickChoice(sandbox, 0);
    const expectation = sandbox
      .mock(vscode.commands)
      .expects('executeCommand')
      .once()
      .withArgs('vscode.open', vscode.Uri.parse(snippetUrl));

    await createSnippet();
    expectation.verify();
  });
});
