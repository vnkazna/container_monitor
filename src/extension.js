const vscode = require('vscode');
const openers = require('./openers');
const tokenInput = require('./token_input');
const { tokenService } = require('./services/token_service');
const tokenServiceWrapper = require('./token_service_wrapper');
const pipelineActionsPicker = require('./pipeline_actions_picker');
const searchInput = require('./search_input');
const { createSnippet } = require('./commands/create_snippet');
const { insertSnippet } = require('./commands/insert_snippet');
const sidebar = require('./sidebar');
const ciConfigValidator = require('./ci_config_validator');
const webviewController = require('./webview_controller');
const IssuableDataProvider = require('./data_providers/issuable').DataProvider;
const CurrentBranchDataProvider = require('./data_providers/current_branch').DataProvider;
const { initializeLogging, handleError } = require('./log');
const checkDeprecatedCertificateSettings = require('./check_deprecated_certificate_settings');
const { GitContentProvider } = require('./review/file_diff_provider');

vscode.gitLabWorkflow = {
  sidebarDataProviders: [],
};

const wrapWithCatch = command => async (...args) => {
  try {
    await command(...args);
  } catch (e) {
    await handleError(e);
  }
};

const registerSidebarTreeDataProviders = () => {
  const issuableDataProvider = new IssuableDataProvider();

  const currentBranchDataProvider = new CurrentBranchDataProvider();

  const register = (name, provider) => {
    vscode.window.registerTreeDataProvider(name, provider);
    vscode.gitLabWorkflow.sidebarDataProviders.push(provider);
  };

  register('issuesAndMrs', issuableDataProvider);
  register('currentBranchInfo', currentBranchDataProvider);
};

const registerCommands = (context, outputChannel) => {
  const commands = {
    'gl.showIssuesAssignedToMe': openers.showIssues,
    'gl.showMergeRequestsAssignedToMe': openers.showMergeRequests,
    'gl.setToken': tokenInput.showInput,
    'gl.removeToken': tokenInput.removeTokenPicker,
    'gl.openActiveFile': openers.openActiveFile,
    'gl.copyLinkToActiveFile': openers.copyLinkToActiveFile,
    'gl.openCurrentMergeRequest': openers.openCurrentMergeRequest,
    'gl.openCreateNewIssue': openers.openCreateNewIssue,
    'gl.openCreateNewMR': openers.openCreateNewMr,
    'gl.openProjectPage': openers.openProjectPage,
    'gl.openCurrentPipeline': openers.openCurrentPipeline,
    'gl.pipelineActions': pipelineActionsPicker.showPicker,
    'gl.issueSearch': searchInput.showIssueSearchInput,
    'gl.mergeRequestSearch': searchInput.showMergeRequestSearchInput,
    'gl.projectAdvancedSearch': searchInput.showProjectAdvancedSearchInput,
    'gl.compareCurrentBranch': openers.compareCurrentBranch,
    'gl.createSnippet': createSnippet,
    'gl.insertSnippet': insertSnippet,
    'gl.validateCIConfig': ciConfigValidator.validate,
    'gl.refreshSidebar': sidebar.refresh,
    'gl.showRichContent': webviewController.create,
    'gl.showOutput': () => outputChannel.show(),
  };

  Object.keys(commands).forEach(cmd => {
    context.subscriptions.push(vscode.commands.registerCommand(cmd, wrapWithCatch(commands[cmd])));
  });

  registerSidebarTreeDataProviders();
};

const activate = context => {
  const outputChannel = vscode.window.createOutputChannel('GitLab Workflow');
  initializeLogging(line => outputChannel.appendLine(line));

  registerCommands(context, outputChannel);
  webviewController.addDeps(context);
  tokenService.init(context);
  tokenServiceWrapper.init(context);
  checkDeprecatedCertificateSettings(context);
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('gl-review', new GitContentProvider()),
  );
};

exports.activate = activate;
