const assert = require('assert');
const vscode = require('vscode');
const sinon = require('sinon');
const EventEmitter = require('events');
const webviewController = require('../../src/webview_controller');
const { tokenService } = require('../../src/services/token_service');
const openIssueResponse = require('./fixtures/rest/open_issue.json');

const {
  getServer,
  createJsonEndpoint,
  createPostEndpoint,
} = require('./test_infrastructure/mock_server');
const { GITLAB_URL } = require('./test_infrastructure/constants');

const waitForMessage = (panel, type) =>
  new Promise(resolve => {
    const sub = panel.webview.onDidReceiveMessage(message => {
      if (message.type !== type) return;
      sub.dispose();
      resolve(message);
    });
  });

describe('GitLab webview', () => {
  let server;
  let webviewPanel;
  const sandbox = sinon.createSandbox();

  before(async () => {
    server = getServer([
      createJsonEndpoint(
        `/projects/${openIssueResponse.project_id}/issues/${openIssueResponse.iid}/discussions`,
        [],
      ),
      createJsonEndpoint(
        `/projects/${openIssueResponse.project_id}/issues/${openIssueResponse.iid}/resource_label_events`,
        [],
      ),
      createPostEndpoint(
        `/projects/${openIssueResponse.project_id}/issues/${openIssueResponse.iid}/notes`,
        {},
      ),
    ]);
    await tokenService.setToken(GITLAB_URL, 'abcd-secret');
  });

  /*
  This method replaces the mechanism that the Webview panel uses for sending messages between
  the extension and the webview. This is necessary since we can't control the webview and so
  we need to be able to simulate events triggered by the webview and see that the extension
  handles them well.
  */
  const replacePanelEventSystem = () => {
    const { createWebviewPanel } = vscode.window;
    sandbox.stub(vscode.window, 'createWebviewPanel').callsFake((viewType, title, column) => {
      const panel = createWebviewPanel(viewType, title, column);
      const eventEmitter = new EventEmitter();
      sandbox
        .stub(panel.webview, 'postMessage')
        .callsFake(message => eventEmitter.emit('', message));
      sandbox.stub(panel.webview, 'onDidReceiveMessage').callsFake(listener => {
        eventEmitter.on('', listener);
        return { dispose: () => {} };
      });
      return panel;
    });
  };

  beforeEach(async () => {
    server.resetHandlers();
    replacePanelEventSystem();
    webviewPanel = await webviewController.create(
      openIssueResponse,
      vscode.workspace.workspaceFolders[0],
    );
  });

  afterEach(async () => {
    sandbox.restore();
  });

  after(async () => {
    server.close();
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  it('sends a message', async () => {
    webviewPanel.webview.postMessage({
      command: 'saveNote',
      issuable: openIssueResponse,
      note: 'Hello',
      noteType: { path: 'issues' },
    });
    const sentMessage = await waitForMessage(webviewPanel, 'noteSaved');
    assert.strictEqual(sentMessage.type, 'noteSaved');
    assert.strictEqual(sentMessage.status, undefined);
  });
});
