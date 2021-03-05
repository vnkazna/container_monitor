import * as assert from 'assert';
import * as vscode from 'vscode';
import { GitLabComment } from '../review/gitlab_comment';
import { GitLabCommentThread } from '../review/gitlab_comment_thread';

const getGitLabThreadFromVsThread = (thread: vscode.CommentThread): GitLabCommentThread => {
  const firstComment = thread.comments[0];
  assert(firstComment && firstComment instanceof GitLabComment);
  return firstComment.thread;
};

export const toggleResolved = async (vsThread: vscode.CommentThread): Promise<void> => {
  const gitlabThread = getGitLabThreadFromVsThread(vsThread);
  return gitlabThread.toggleResolved();
};

export const deleteComment = async (comment: GitLabComment): Promise<void> => {
  const DELETE_ACTION = 'Delete';
  const shouldDelete = await vscode.window.showWarningMessage(
    'Delete comment?',
    { modal: true },
    DELETE_ACTION,
  );
  if (shouldDelete !== DELETE_ACTION) {
    return undefined;
  }
  return comment.thread.deleteComment(comment);
};

export const editComment = (comment: GitLabComment): void => {
  comment.thread.startEdit(comment);
};

export const cancelEdit = (comment: GitLabComment): void => {
  comment.thread.cancelEdit(comment);
};

export const submitEdit = async (comment: GitLabComment): Promise<void> => {
  return comment.thread.submitEdit(comment);
};
