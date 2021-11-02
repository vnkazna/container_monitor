const vscode = require('vscode');
const { extensionState } = require('../../../src/extension_state');
const { tokenService } = require('../../../src/services/token_service');
const { webviewController } = require('../../../src/webview_controller');
const { GITLAB_URL } = require('./constants');
const { InMemoryMemento } = require('./in_memory_memento');

const useInMemoryGlobalStateInTokenService = () => {
  tokenService.init({
    globalState: new InMemoryMemento(),
  });
};

const initializeTestEnvironment = async testRoot => {
  useInMemoryGlobalStateInTokenService();
  await tokenService.setToken(GITLAB_URL, 'abcd-secret');
  process.env.GITLAB_WORKFLOW_INSTANCE_URL = GITLAB_URL;
  process.env.GITLAB_WORKFLOW_TOKEN = 'abcd-secret';
  extensionState.init(tokenService);
  webviewController.init({ extensionPath: `${testRoot}/../../..` });
  const ext = vscode.extensions.getExtension('gitlab.gitlab-workflow');
  await ext.activate();
};

module.exports = { initializeTestEnvironment };
