export const GITLAB_COM_URL = 'https://gitlab.com';
export const REVIEW_URI_SCHEME = 'gl-review';
export const CONFIG_NAMESPACE = 'gitlab';
export const CONFIG_CUSTOM_QUERIES = 'customQueries';
export const ADDED = 'added';
export const DELETED = 'deleted';
export const RENAMED = 'renamed';
export const MODIFIED = 'modified';
export const DO_NOT_SHOW_VERSION_WARNING = 'DO_NOT_SHOW_VERSION_WARNING';
// NOTE: This needs to _always_ be a 3 digits
export const MINIMUM_VERSION = '13.6.0';

export const CHANGE_TYPE_QUERY_KEY = 'changeType';
export const HAS_COMMENTS_QUERY_KEY = 'hasComments';
export const PATCH_TITLE_PREFIX = 'patch: ';
export const PATCH_FILE_SUFFIX = '.patch';

/** Synced comment is stored in the GitLab instance */
export const SYNCED_COMMENT_CONTEXT = 'synced-comment';
/** Failed comment is only stored in the extension, it failed to be created in GitLab */
export const FAILED_COMMENT_CONTEXT = 'failed-comment';
