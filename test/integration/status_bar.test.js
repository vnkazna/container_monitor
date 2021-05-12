const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const { StatusBar } = require('../../src/status_bar');
const { tokenService } = require('../../src/services/token_service');
const pipelinesResponse = require('./fixtures/rest/pipelines.json');
const { getServer, createQueryJsonEndpoint } = require('./test_infrastructure/mock_server');
const { GITLAB_URL } = require('./test_infrastructure/constants');
const { USER_COMMANDS } = require('../../src/command_names');
const { updateRepositoryStatus } = require('./test_infrastructure/helpers');

describe('GitLab status bar', () => {
  let server;
  let statusBar;
  let returnedItems = [];
  const sandbox = sinon.createSandbox();

  const createFakeStatusBarItem = () => {
    const fakeItem = { show: sinon.spy(), hide: sinon.spy(), dispose: sinon.spy() };
    returnedItems.push(fakeItem);
    return fakeItem;
  };

  before(async () => {
    server = getServer([
      createQueryJsonEndpoint('/projects/278964/pipelines', { '?ref=master': pipelinesResponse }),
    ]);
    await tokenService.setToken(GITLAB_URL, 'abcd-secret');
    await updateRepositoryStatus();
  });

  beforeEach(() => {
    statusBar = new StatusBar();
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
    await statusBar.init();

    assert.strictEqual(
      vscode.window.createStatusBarItem.firstCall.firstArg,
      vscode.StatusBarAlignment.Left,
    );
    const pipelineItem = statusBar.pipelineStatusBarItem;
    assert.strictEqual(pipelineItem.text, '$(check) GitLab: Pipeline passed');
    assert.strictEqual(pipelineItem.show.called, true);
    assert.strictEqual(pipelineItem.hide.called, false);
    assert.strictEqual(pipelineItem.command, USER_COMMANDS.PIPELINE_ACTIONS);
  });
});
