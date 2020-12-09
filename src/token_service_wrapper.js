const vscode = require('vscode');
const { GITLAB_COM_URL } = require('./constants');
const openers = require('./openers');
const statusBar = require('./status_bar');
const { tokenService } = require('./services/token_service');
const { USER_COMMANDS } = require('./command_names');

let context = null;
let active = false;

const currentInstanceUrl = () =>
  vscode.workspace.getConfiguration('gitlab').instanceUrl || GITLAB_COM_URL;

const getToken = (instanceUrl = currentInstanceUrl()) => tokenService.getToken(instanceUrl);

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
          vscode.commands.executeCommand(USER_COMMANDS.SET_TOKEN);
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
  tokenService.onDidChange(() => updateExtensionStatus());
  askForToken();
  updateExtensionStatus();
  watchConfigurationChanges();
};

exports.init = init;
