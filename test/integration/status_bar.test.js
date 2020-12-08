const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const statusBar = require('../../src/status_bar');
const { tokenService } = require('../../src/services/token_service');
const pipelinesResponse = require('./fixtures/rest/pipelines.json');
const pipelineResponse = require('./fixtures/rest/pipeline.json');
const { getServer, createJsonEndpoint } = require('./test_infrastructure/mock_server');
const { GITLAB_URL } = require('./test_infrastructure/constants');
const { USER_COMMANDS } = require('../../src/command_names');

describe('GitLab status bar', () => {
  let server;
  let returnedItems = [];
  const sandbox = sinon.createSandbox();

  const createFakeStatusBarItem = () => {
    const fakeItem = { show: sinon.spy(), hide: sinon.spy(), dispose: sinon.spy() };
    returnedItems.push(fakeItem);
    return fakeItem;
  };

  before(async () => {
    server = getServer([
      createJsonEndpoint('/projects/278964/pipelines?ref=master', pipelinesResponse),
      createJsonEndpoint('/projects/278964/pipelines/47', pipelineResponse),
    ]);
    await tokenService.setToken(GITLAB_URL, 'abcd-secret');
  });

  beforeEach(() => {
    server.resetHandlers();
    sandbox.stub(vscode.window, 'createStatusBarItem').callsFake(createFakeStatusBarItem);
  });

  afterEach(() => {
    statusBar.dispose();
    sandbox.restore();
    returnedItems = [];
  });

  after(async () => {
    server.close();
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  it('shows the correct pipeline item', async () => {
    await statusBar.init({ subscriptions: [] });

    assert.strictEqual(
      vscode.window.createStatusBarItem.firstCall.firstArg,
      vscode.StatusBarAlignment.Left,
    );
    const pipelineItem = returnedItems[0];
    assert.strictEqual(pipelineItem.text, '$(check) GitLab: Pipeline passed');
    assert.strictEqual(pipelineItem.show.called, true);
    assert.strictEqual(pipelineItem.hide.called, false);
    assert.strictEqual(pipelineItem.command, USER_COMMANDS.PIPELINE_ACTIONS);
  });
});
