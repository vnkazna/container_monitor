import * as assert from 'assert';
import * as vscode from 'vscode';
import { getNewLineForOldUnchangedLine } from '../git/diff_line_count';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { GitLabComment } from '../review/gitlab_comment';
import { GitLabCommentThread } from '../review/gitlab_comment_thread';
import { fromReviewUri } from '../review/review_uri';
import { findFileInDiffs } from '../utils/find_file_in_diffs';

const getLineNumber = (thread: vscode.CommentThread) => thread.range.start.line + 1;

const createNewComment = async (
  text: string,
  thread: vscode.CommentThread,
): Promise<GitLabCommentThread> => {
  const { path, commit, repositoryRoot, mrId } = fromReviewUri(thread.uri);
  const repository = gitExtensionWrapper.getRepository(repositoryRoot);
  const cachedMr = repository.getMr(mrId);
  assert(cachedMr);
  const { mr, mrVersion } = cachedMr;
  const isOld = commit === mrVersion.base_commit_sha;
  const diff = findFileInDiffs(mrVersion.diffs, isOld ? { oldPath: path } : { newPath: path });
  assert(diff);
  const positionFragment = isOld
    ? {
        oldLine: getLineNumber(thread),
        // we let user comment on any line on the old version of the diff
        // this means some of the lines might be unchanged
        // till https://gitlab.com/gitlab-org/gitlab/-/issues/325161 gets fixed, we need to compute
        // the new line index for unchanged line.
        newLine: getNewLineForOldUnchangedLine(mrVersion, path!, getLineNumber(thread)),
      }
    : { newLine: getLineNumber(thread) };
  const discussion = await repository.getGitLabService().createDiffNote(mrId, text, {
    baseSha: mrVersion.base_commit_sha,
    headSha: mrVersion.head_commit_sha,
    startSha: mrVersion.start_commit_sha,
    paths: {
      oldPath: diff.old_path,
      newPath: diff.new_path,
    },
    ...positionFragment,
  });

  return new GitLabCommentThread(thread, discussion, repository.getGitLabService(), mr);
};

export const toggleResolved = async (vsThread: vscode.CommentThread): Promise<void> => {
  const firstComment = vsThread.comments[0];
  assert(firstComment instanceof GitLabComment);
  const gitlabThread = firstComment.thread;

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
  const firstComment = thread.comments[0];
  if (!firstComment) {
    await createNewComment(text, thread);
    return undefined;
  }
  assert(firstComment instanceof GitLabComment);
  const gitlabThread = firstComment.thread;

  return gitlabThread.reply(text);
};
