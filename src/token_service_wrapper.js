const vscode = require('vscode');
const { GITLAB_COM_URL } = require('./constants');
const { instance: statusBar } = require('./status_bar');
const { tokenService } = require('./services/token_service');

let context = null;
let active = false;

// FIXME: if you are touching this configuration statement, move the configuration to get_extension_configuration.ts
const currentInstanceUrl = () =>
  vscode.workspace.getConfiguration('gitlab').instanceUrl || GITLAB_COM_URL;

const getToken = () => tokenService.getToken(currentInstanceUrl());

const updateExtensionStatus = () => {
  const tokenExists = !!getToken();

  if (!active && tokenExists) {
    statusBar.init();
    context.subscriptions.push(statusBar);
    active = true;
  } else if (active && !tokenExists) {
    statusBar.dispose();
    active = false;
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
  updateExtensionStatus();
  watchConfigurationChanges();
};

exports.init = init;
