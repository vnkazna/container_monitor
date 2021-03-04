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
