const vscode = require('vscode');
const openers = require('./openers');
const tokenInput = require('./token_input');
const { tokenService } = require('./services/token_service');
const { extensionState } = require('./extension_state');
const searchInput = require('./search_input');
const { createSnippet } = require('./commands/create_snippet');
const { insertSnippet } = require('./commands/insert_snippet');
const ciConfigValidator = require('./ci_config_validator');
const { webviewController } = require('./webview_controller');
const { issuableDataProvider } = require('./tree_view/issuable_data_provider');
const { currentBranchDataProvider } = require('./tree_view/current_branch_data_provider');
const { initializeLogging, handleError } = require('./log');
const { GitContentProvider } = require('./review/git_content_provider');
const { REVIEW_URI_SCHEME, REMOTE_URI_SCHEME } = require('./constants');
const { USER_COMMANDS, PROGRAMMATIC_COMMANDS } = require('./command_names');
const { CiCompletionProvider } = require('./completion/ci_completion_provider');
const { gitExtensionWrapper } = require('./git/git_extension_wrapper');
const {
  toggleResolved,
  deleteComment,
  editComment: startEdit,
  cancelEdit,
  submitEdit,
  createComment,
  cancelFailedComment,
  retryFailedComment,
} = require('./commands/mr_discussion_commands');
const { hasCommentsDecorationProvider } = require('./review/has_comments_decoration_provider');
const { changeTypeDecorationProvider } = require('./review/change_type_decoration_provider');
const { checkoutMrBranch } = require('./commands/checkout_mr_branch');
const { cloneWiki } = require('./commands/clone_wiki');
const { createSnippetPatch } = require('./commands/create_snippet_patch');
const { applySnippetPatch } = require('./commands/apply_snippet_patch');
const { openMrFile } = require('./commands/open_mr_file');
const { GitLabRemoteFileSystem } = require('./remotefs/gitlab_remote_file_system');
const { openRepository } = require('./commands/open_repository');
const { contextUtils } = require('./utils/context_utils');
const { currentBranchRefresher } = require('./current_branch_refresher');
const { statusBar } = require('./status_bar');
const {
  runWithValidProject,
  runWithValidProjectFile,
} = require('./commands/run_with_valid_project');
const { triggerPipelineAction } = require('./commands/trigger_pipeline_action');

const wrapWithCatch =
  command =>
  async (...args) => {
    try {
      await command(...args);
    } catch (e) {
      handleError(e);
    }
  };

const registerSidebarTreeDataProviders = () => {
  vscode.window.registerTreeDataProvider('issuesAndMrs', issuableDataProvider);
  vscode.window.registerTreeDataProvider('currentBranchInfo', currentBranchDataProvider);
};

const registerCommands = (context, outputChannel) => {
  const commands = {
    [USER_COMMANDS.SHOW_ISSUES_ASSIGNED_TO_ME]: runWithValidProject(openers.showIssues),
    [USER_COMMANDS.SHOW_MERGE_REQUESTS_ASSIGNED_TO_ME]: runWithValidProject(
      openers.showMergeRequests,
    ),
    [USER_COMMANDS.SET_TOKEN]: tokenInput.showInput,
    [USER_COMMANDS.REMOVE_TOKEN]: tokenInput.removeTokenPicker,
    [USER_COMMANDS.OPEN_ACTIVE_FILE]: runWithValidProjectFile(openers.openActiveFile),
    [USER_COMMANDS.COPY_LINK_TO_ACTIVE_FILE]: runWithValidProjectFile(openers.copyLinkToActiveFile),
    [USER_COMMANDS.OPEN_CURRENT_MERGE_REQUEST]: runWithValidProjectFile(
      openers.openCurrentMergeRequest,
    ),
    [USER_COMMANDS.OPEN_CREATE_NEW_ISSUE]: runWithValidProject(openers.openCreateNewIssue),
    [USER_COMMANDS.OPEN_CREATE_NEW_MR]: runWithValidProject(openers.openCreateNewMr),
    [USER_COMMANDS.OPEN_PROJECT_PAGE]: runWithValidProject(openers.openProjectPage),
    [USER_COMMANDS.PIPELINE_ACTIONS]: runWithValidProject(triggerPipelineAction),
    [USER_COMMANDS.ISSUE_SEARCH]: searchInput.showIssueSearchInput,
    [USER_COMMANDS.MERGE_REQUEST_SEARCH]: searchInput.showMergeRequestSearchInput,
    [USER_COMMANDS.PROJECT_ADVANCED_SEARCH]: searchInput.showProjectAdvancedSearchInput,
    [USER_COMMANDS.COMPARE_CURRENT_BRANCH]: runWithValidProject(openers.compareCurrentBranch),
    [USER_COMMANDS.CREATE_SNIPPET]: runWithValidProject(createSnippet),
    [USER_COMMANDS.INSERT_SNIPPET]: runWithValidProject(insertSnippet),
    [USER_COMMANDS.VALIDATE_CI_CONFIG]: ciConfigValidator.validate,
    [PROGRAMMATIC_COMMANDS.SHOW_RICH_CONTENT]: webviewController.open.bind(webviewController),
    [USER_COMMANDS.SHOW_OUTPUT]: () => outputChannel.show(),
    [USER_COMMANDS.RESOLVE_THREAD]: toggleResolved,
    [USER_COMMANDS.UNRESOLVE_THREAD]: toggleResolved,
    [USER_COMMANDS.DELETE_COMMENT]: deleteComment,
    [USER_COMMANDS.START_EDITING_COMMENT]: startEdit,
    [USER_COMMANDS.CANCEL_EDITING_COMMENT]: cancelEdit,
    [USER_COMMANDS.SUBMIT_COMMENT_EDIT]: submitEdit,
    [USER_COMMANDS.CREATE_COMMENT]: createComment,
    [USER_COMMANDS.CHECKOUT_MR_BRANCH]: checkoutMrBranch,
    [USER_COMMANDS.CLONE_WIKI]: cloneWiki,
    [USER_COMMANDS.CREATE_SNIPPET_PATCH]: runWithValidProject(createSnippetPatch),
    [USER_COMMANDS.APPLY_SNIPPET_PATCH]: runWithValidProject(applySnippetPatch),
    [USER_COMMANDS.CANCEL_FAILED_COMMENT]: cancelFailedComment,
    [USER_COMMANDS.RETRY_FAILED_COMMENT]: retryFailedComment,
    [USER_COMMANDS.OPEN_REPOSITORY]: openRepository,
    [USER_COMMANDS.REFRESH_SIDEBAR]: () => {
      issuableDataProvider.refresh();
      currentBranchRefresher.refresh(true);
    },
    [USER_COMMANDS.OPEN_MR_FILE]: openMrFile,
    [PROGRAMMATIC_COMMANDS.NO_IMAGE_REVIEW]: () =>
      vscode.window.showInformationMessage("GitLab MR review doesn't support images yet."),
  };

  Object.keys(commands).forEach(cmd => {
    context.subscriptions.push(vscode.commands.registerCommand(cmd, wrapWithCatch(commands[cmd])));
  });

  registerSidebarTreeDataProviders();
};

const registerCiCompletion = context => {
  const subscription = vscode.languages.registerCompletionItemProvider(
    { pattern: '**/.gitlab-ci*.{yml,yaml}' },
    new CiCompletionProvider(),
    '$',
  );

  context.subscriptions.push(subscription);
};

/**
 * @param {vscode.ExtensionContext} context
 */
const activate = context => {
  contextUtils.init(context);

  const outputChannel = vscode.window.createOutputChannel('GitLab Workflow');
  initializeLogging(line => outputChannel.appendLine(line));
  vscode.workspace.registerTextDocumentContentProvider(REVIEW_URI_SCHEME, new GitContentProvider());
  vscode.workspace.registerFileSystemProvider(
    REMOTE_URI_SCHEME,
    new GitLabRemoteFileSystem(),
    GitLabRemoteFileSystem.OPTIONS,
  );
  registerCommands(context, outputChannel);
  const isDev = process.env.NODE_ENV === 'development';
  webviewController.init(context, isDev);
  tokenService.init(context);
  extensionState.init(tokenService);
  registerCiCompletion(context);
  gitExtensionWrapper.init();
  context.subscriptions.push(gitExtensionWrapper);
  statusBar.init();
  context.subscriptions.push(statusBar);
  currentBranchRefresher.init(statusBar, currentBranchDataProvider);
  context.subscriptions.push(currentBranchRefresher);

  vscode.window.registerFileDecorationProvider(hasCommentsDecorationProvider);
  vscode.window.registerFileDecorationProvider(changeTypeDecorationProvider);
};

exports.activate = activate;
