import * as assert from 'assert';
import * as vscode from 'vscode';
import { GqlDiscussion, GqlGenericNote, GqlTextDiffDiscussion } from '../gitlab/gitlab_new_service';
import { getFileDiff, getRemovedLinesFromDiff } from '../review/get_added_lines_from_diff';
import { GitLabComment } from '../review/gitlab_comment';
import { GitLabCommentThread } from '../review/gitlab_comment_thread';
import { mrManager } from '../review/MrManager';
import { MrRepository } from '../review/MrRepository';
import { fromReviewUri } from '../review/review_uri';
import { createGitLabNewService } from '../service_factory';

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

const createFirstCommentInThread = async (text: string, thread: vscode.CommentThread) => {
  const { workspacePath, mrId, mrIid, mrCommentPayload, commit, projectId, path } = fromReviewUri(
    thread.uri,
  );
  const isOld = commit === mrCommentPayload.baseSha;
  const mrModel = (await mrManager.getMrRepository(workspacePath)).getStoredMr(mrId);
  assert(mrModel);
  assert(path);
  const mrVersion = await mrModel.getVersion();
  const fileDiff = getFileDiff(mrVersion, isOld, path);
  const removedLines = getRemovedLinesFromDiff(fileDiff!.diff);
  const diffLine = thread.range.start.line + 1;
  const oldPosition = { oldLine: diffLine };
  const newPosition = { newLine: diffLine };
  let positionFragment;
  // if the line hasn't changed (we are commenting on unchanged part of the diff)
  if (isOld && !removedLines.includes(diffLine)) {
    positionFragment = { ...oldPosition, ...newPosition };
  } else {
    positionFragment = isOld ? oldPosition : newPosition;
  }
  const { baseSha, headSha, startSha, oldPath, newPath } = mrCommentPayload;
  const gitlabService = await createGitLabNewService(workspacePath);
  const note = await gitlabService.createDiffNote(mrId, text, {
    baseSha,
    headSha,
    startSha,
    paths: {
      oldPath,
      newPath,
    },
    ...positionFragment,
  });
  // PROBLEM: We only get a note, not the discussion and we have to ask for all discussions because there is no better endpoint
  const freshDiscussions = await mrModel.getDiscussions();
  const discussion = freshDiscussions.find(d =>
    Boolean((d.notes.nodes as GqlGenericNote<null>[]).find(n => n.id === note.id)),
  ); // This should be done better
  assert(discussion);
  GitLabCommentThread.createGitLabThreadWithVsThread(
    thread,
    discussion as GqlTextDiffDiscussion,
    gitlabService,
    mrModel.mr,
  );
};

const createReplyComment = async (text: string, thread: vscode.CommentThread) => {
  const gitlabThread = getGitLabThreadFromVsThread(thread);
  return gitlabThread.reply(text);
};

export const createComment = async ({
  text,
  thread,
}: {
  text: string;
  thread: vscode.CommentThread;
}): Promise<void> => {
  if (thread.comments.length === 0) {
    await createFirstCommentInThread(text, thread);
  } else {
    await createReplyComment(text, thread);
  }
};
