import vscode from 'vscode';
import * as openers from './openers';
import * as tokenInput from './token_input';
import { tokenService } from './services/token_service';
import { extensionState } from './extension_state';
import searchInput from './search_input.js';
import { createSnippet } from './commands/create_snippet';
import { insertSnippet } from './commands/insert_snippet';
import * as ciConfigValidator from './ci_config_validator';
import { webviewController } from './webview_controller';
import { issuableDataProvider } from './tree_view/issuable_data_provider';
import { currentBranchDataProvider } from './tree_view/current_branch_data_provider';
import { initializeLogging, handleError } from './log';
import { GitContentProvider } from './review/git_content_provider';
import { REVIEW_URI_SCHEME, REMOTE_URI_SCHEME } from './constants';
import { USER_COMMANDS, PROGRAMMATIC_COMMANDS } from './command_names';
import { CiCompletionProvider } from './completion/ci_completion_provider';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import {
  toggleResolved,
  deleteComment,
  editComment as startEdit,
  cancelEdit,
  submitEdit,
  createComment,
  cancelFailedComment,
  retryFailedComment,
} from './commands/mr_discussion_commands';
import { hasCommentsDecorationProvider } from './review/has_comments_decoration_provider';
import { changeTypeDecorationProvider } from './review/change_type_decoration_provider';
import { checkoutMrBranch } from './commands/checkout_mr_branch';
import { cloneWiki } from './commands/clone_wiki';
import { createSnippetPatch } from './commands/create_snippet_patch';
import { applySnippetPatch } from './commands/apply_snippet_patch';
import { openMrFile } from './commands/open_mr_file';
import { GitLabRemoteFileSystem } from './remotefs/gitlab_remote_file_system';
import { openRepository } from './commands/open_repository';
import { contextUtils } from './utils/context_utils';
import { currentBranchRefresher } from './current_branch_refresher';
import { statusBar } from './status_bar';
import {
  runWithValidProject,
  runWithValidProjectFile,
  diagnoseRepository,
} from './commands/run_with_valid_project';
import { triggerPipelineAction } from './commands/trigger_pipeline_action';
import { setSidebarViewState, SidebarViewState } from './tree_view/sidebar_view_state';
import { doNotAwait } from './utils/do_not_await';
import { gitlabProjectRepository } from './gitlab/gitlab_project_repository';
import { selectProject, selectProjectForRepository } from './gitlab/select_project';

const wrapWithCatch =
  (command: (...args: unknown[]) => unknown) =>
  async (...args: unknown[]) => {
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

const registerCommands = (
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel,
) => {
  const commands = {
    [USER_COMMANDS.SHOW_ISSUES_ASSIGNED_TO_ME]: runWithValidProject(openers.showIssues),
    [USER_COMMANDS.SHOW_MERGE_REQUESTS_ASSIGNED_TO_ME]: runWithValidProject(
      openers.showMergeRequests,
    ),
    [USER_COMMANDS.SET_TOKEN]: tokenInput.showInput,
    [USER_COMMANDS.REMOVE_TOKEN]: tokenInput.removeTokenPicker,
    [USER_COMMANDS.OPEN_ACTIVE_FILE]: runWithValidProjectFile(openers.openActiveFile),
    [USER_COMMANDS.COPY_LINK_TO_ACTIVE_FILE]: runWithValidProjectFile(openers.copyLinkToActiveFile),
    [USER_COMMANDS.OPEN_CURRENT_MERGE_REQUEST]: runWithValidProject(
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
    [USER_COMMANDS.VALIDATE_CI_CONFIG]: runWithValidProject(ciConfigValidator.validate),
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
    [USER_COMMANDS.SIDEBAR_VIEW_AS_LIST]: () => setSidebarViewState(SidebarViewState.ListView),
    [USER_COMMANDS.SIDEBAR_VIEW_AS_TREE]: () => setSidebarViewState(SidebarViewState.TreeView),
    [USER_COMMANDS.REFRESH_SIDEBAR]: async () => {
      issuableDataProvider.refresh();
      await currentBranchRefresher.refresh(true);
    },
    [USER_COMMANDS.OPEN_MR_FILE]: openMrFile,
    [USER_COMMANDS.SELECT_PROJECT_FOR_REPOSITORY]: selectProjectForRepository,
    [PROGRAMMATIC_COMMANDS.DIAGNOSE_REPOSITORY]: diagnoseRepository,
    [PROGRAMMATIC_COMMANDS.SELECT_PROJECT]: selectProject,
    [PROGRAMMATIC_COMMANDS.NO_IMAGE_REVIEW]: () =>
      vscode.window.showInformationMessage("GitLab MR review doesn't support images yet."),
  };

  Object.keys(commands).forEach(cmd => {
    context.subscriptions.push(
      vscode.commands.registerCommand(cmd, wrapWithCatch(commands[cmd] as any)),
    );
  });

  registerSidebarTreeDataProviders();
};

const registerCiCompletion = (context: vscode.ExtensionContext) => {
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
export const activate = async (context: vscode.ExtensionContext) => {
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
  registerCiCompletion(context);
  context.subscriptions.push(gitExtensionWrapper);
  statusBar.init();
  context.subscriptions.push(statusBar);
  currentBranchRefresher.init(statusBar, currentBranchDataProvider);
  context.subscriptions.push(currentBranchRefresher);

  vscode.window.registerFileDecorationProvider(hasCommentsDecorationProvider);
  vscode.window.registerFileDecorationProvider(changeTypeDecorationProvider);
  // we don't want to hold the extension startup by waiting on VS Code and GitLab API
  doNotAwait(
    Promise.all([
      setSidebarViewState(SidebarViewState.ListView),
      extensionState.init(tokenService),
      gitExtensionWrapper.init(),
      gitlabProjectRepository.init(),
      currentBranchRefresher.refresh(),
    ]).catch(e => handleError(e)),
  );
};
