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
  OPEN_CURRENT_PIPELINE: 'gl.openCurrentPipeline',
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
};
