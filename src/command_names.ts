/*
  Commands that can be triggered from the command palette.
  These commands must be exactly the same as the contributed commands in package.json.
*/
export const USER_COMMANDS = {
  SET_TOKEN: 'gl.setToken',
  REMOVE_TOKEN: 'gl.removeToken',
  SHOW_ISSUES_ASSIGNED_TO_ME: 'gl.showIssuesAssignedToMe',
  SHOW_MERGE_REQUESTS_ASSIGNED_TO_ME: 'gl.showMergeRequestsAssignedToMe',
  OPEN_ACTIVE_FILE: 'gl.openActiveFile',
  COPY_LINK_TO_ACTIVE_FILE: 'gl.copyLinkToActiveFile',
  OPEN_CURRENT_MERGE_REQUEST: 'gl.openCurrentMergeRequest',
  OPEN_CREATE_NEW_ISSUE: 'gl.openCreateNewIssue',
  OPEN_CREATE_NEW_MR: 'gl.openCreateNewMR',
  OPEN_PROJECT_PAGE: 'gl.openProjectPage',
  PIPELINE_ACTIONS: 'gl.pipelineActions',
  ISSUE_SEARCH: 'gl.issueSearch',
  MERGE_REQUEST_SEARCH: 'gl.mergeRequestSearch',
  PROJECT_ADVANCED_SEARCH: 'gl.projectAdvancedSearch',
  COMPARE_CURRENT_BRANCH: 'gl.compareCurrentBranch',
  CREATE_SNIPPET: 'gl.createSnippet',
  INSERT_SNIPPET: 'gl.insertSnippet',
  VALIDATE_CI_CONFIG: 'gl.validateCIConfig',
  SHOW_OUTPUT: 'gl.showOutput',
  REFRESH_SIDEBAR: 'gl.refreshSidebar',
  RESOLVE_THREAD: 'gl.resolveThread',
  UNRESOLVE_THREAD: 'gl.unresolveThread',
  DELETE_COMMENT: 'gl.deleteComment',
  START_EDITING_COMMENT: 'gl.startEditingComment',
  CANCEL_EDITING_COMMENT: 'gl.cancelEditingComment',
  CANCEL_FAILED_COMMENT: 'gl.cancelFailedComment',
  RETRY_FAILED_COMMENT: 'gl.retryFailedComment',
  SUBMIT_COMMENT_EDIT: 'gl.submitCommentEdit',
  CREATE_COMMENT: 'gl.createComment',
  CHECKOUT_MR_BRANCH: 'gl.checkoutMrBranch',
  CLONE_WIKI: 'gl.cloneWiki',
  CREATE_SNIPPET_PATCH: 'gl.createSnippetPatch',
  APPLY_SNIPPET_PATCH: 'gl.applySnippetPatch',
  OPEN_MR_FILE: 'gl.openMrFile',
  OPEN_REPOSITORY: 'gl.openRepository',
};

/*
  User can't trigger these commands directly. We use them from within the code.
*/
export const PROGRAMMATIC_COMMANDS = {
  SHOW_RICH_CONTENT: 'gl.showRichContent',
  NO_IMAGE_REVIEW: 'gl.noImageReview',
};

export const VS_COMMANDS = {
  DIFF: 'vscode.diff',
  OPEN: 'vscode.open',
  GIT_SHOW_OUTPUT: 'git.showOutput',
  GIT_CLONE: 'git.clone',
  MARKDOWN_SHOW_PREVIEW: 'markdown.showPreview',
};
