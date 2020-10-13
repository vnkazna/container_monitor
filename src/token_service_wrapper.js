const vscode = require('vscode');
const { GITLAB_COM_URL } = require('./constants');
const openers = require('./openers');
const statusBar = require('./status_bar');
const { TokenService } = require('./services/token_service');

let context = null;
let active = false;
let tokenService = null;

const currentInstanceUrl = () =>
  vscode.workspace.getConfiguration('gitlab').instanceUrl || GITLAB_COM_URL;

const getToken = (instanceUrl = currentInstanceUrl()) => tokenService.getToken(instanceUrl);

const getInstanceUrls = () => tokenService.instanceUrls;

const updateExtensionStatus = () => {
  const tokenExists = !!getToken();

  if (!active && tokenExists) {
    statusBar.init(context);
    active = true;
  } else if (active && !tokenExists) {
    statusBar.dispose();
    active = false;
  }
};

const setToken = (instanceUrl, token) => tokenService.setToken(instanceUrl, token);

const askForToken = () => {
  if (!getToken() && !context.workspaceState.get('askedForToken')) {
    const message =
      'GitLab Workflow: Please set GitLab Personal Access Token to setup this extension.';
    const setButton = { title: 'Set Token Now', action: 'set' };
    const readMore = { title: 'Read More', action: 'more' };

    context.workspaceState.update('askedForToken', true);
    vscode.window.showInformationMessage(message, readMore, setButton).then(item => {
      if (item) {
        const { action } = item;

        if (action === 'set') {
          vscode.commands.executeCommand('gl.setToken');
        } else {
          openers.openUrl('https://gitlab.com/gitlab-org/gitlab-vscode-extension#setup');
        }
      }
    });
  }
};

const watchConfigurationChanges = () => {
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('gitlab')) {
      updateExtensionStatus();
    }
  });
};

const init = ctx => {
  context = ctx;
  tokenService = new TokenService(ctx);
  tokenService.onDidChange(() => updateExtensionStatus());
  askForToken();
  updateExtensionStatus();
  watchConfigurationChanges();
};

exports.init = init;
exports.getToken = getToken;
exports.setToken = setToken;
exports.getInstanceUrls = getInstanceUrls;
