import * as assert from 'assert';
import * as vscode from 'vscode';
import { GqlTextDiffDiscussion } from '../gitlab/gitlab_new_service';
import { GitLabComment } from '../review/gitlab_comment';
import { GitLabCommentThread } from '../review/gitlab_comment_thread';
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

export const createComment = async ({
  text,
  thread,
}: {
  text: string;
  thread: vscode.CommentThread;
}): Promise<void> => {
  const { workspacePath, mrId, mrIid, mrCommentPayload, commit, path, projectId } = fromReviewUri(
    thread.uri,
  );
  assert(path);
  assert(commit);
  const isOld = commit === mrCommentPayload.baseSha;
  const positionFragment = isOld
    ? {
        oldLine: thread.range.start.line + 1,
      }
    : {
        newLine: thread.range.start.line + 1,
      };
  const gitLabService = await createGitLabNewService(workspacePath);
  const { baseSha, headSha, startSha, oldPath, newPath } = mrCommentPayload;
  const note = await gitLabService.createDiffNote(mrId, text, {
    baseSha,
    headSha,
    startSha,
    paths: {
      oldPath,
      newPath,
    },
    ...positionFragment,
  });
  const discussion: GqlTextDiffDiscussion = {
    createdAt: note.createdAt,
    resolvable: true,
    resolved: false,
    replyId: note.id,
    notes: {
      nodes: [note],
    },
  };
  GitLabCommentThread.createGitLabThreadWithVsThread(thread, discussion, gitLabService, {
    id: mrId,
    iid: mrIid,
    project_id: projectId,
  } as RestIssuable); // FIXME, please FIXME
};
