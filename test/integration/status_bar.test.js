const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const statusBar = require('../../src/status_bar');
const tokenService = require('../../src/token_service_wrapper');
const getServer = require('./test_infrastructure/mock_server');
const { GITLAB_HOST } = require('./test_infrastructure/constants');

describe('GitLab status bar', () => {
  let server;
  let returnedItems = [];
  const sandbox = sinon.createSandbox();

  const createFakeStatusBarItem = () => {
    const fakeItem = { show: sinon.spy(), hide: sinon.spy(), dispose: sinon.spy() };
    returnedItems.push(fakeItem);
    return fakeItem;
  };

  before(() => {
    server = getServer();
    tokenService.setToken(`https://${GITLAB_HOST}`, 'abcd-secret');
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

  after(() => {
    server.close();
    tokenService.setToken(`https://${GITLAB_HOST}`, undefined);
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
    assert.strictEqual(pipelineItem.command, 'gl.pipelineActions');
  });
});
