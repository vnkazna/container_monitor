import * as vscode from 'vscode';
import { GqlTextDiffDiscussion, GqlTextPosition } from '../gitlab/gitlab_new_service';
import { GitLabComment } from './gitlab_comment';
import { toReviewUri } from './review_uri';

const commentRangeFromPosition = (position: GqlTextPosition): vscode.Range => {
  const glLine = position.oldLine ?? position.newLine;
  const vsPosition = new vscode.Position(glLine - 1, 0); // VS Code numbers lines starting with 0, GitLab starts with 1
  return new vscode.Range(vsPosition, vsPosition);
};

const uriFromPosition = (
  position: GqlTextPosition,
  workspaceFolder: string,
  gitlabProjectId: number,
) => {
  const onOldVersion = position.oldLine === null;
  const path = onOldVersion ? position.oldPath : position.newPath;
  const commit = onOldVersion ? position.diffRefs.baseSha : position.diffRefs.headSha;
  return toReviewUri({
    path,
    commit,
    workspacePath: workspaceFolder,
    projectId: gitlabProjectId,
  });
};

interface CreateThreadOptions {
  commentController: vscode.CommentController;
  workspaceFolder: string;
  gitlabProjectId: number;
  discussion: GqlTextDiffDiscussion;
}

export class GitLabCommentThread {
  private constructor(
    private vsThread: vscode.CommentThread,
    gqlDiscussion: GqlTextDiffDiscussion,
  ) {
    this.vsThread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    this.vsThread.canReply = false;
    if (gqlDiscussion.resolvable) {
      this.vsThread.contextValue = gqlDiscussion.resolved ? 'resolved' : 'unresolved';
    }
  }

  dispose(): void {
    this.vsThread.dispose();
  }

  static createThread({
    commentController,
    workspaceFolder,
    gitlabProjectId,
    discussion,
  }: CreateThreadOptions): GitLabCommentThread {
    const { position } = discussion.notes.nodes[0];
    const vsThread = commentController.createCommentThread(
      uriFromPosition(position, workspaceFolder, gitlabProjectId),
      commentRangeFromPosition(position),
      // the comments need to know about the thread, so we first
      // create empty thread to be able to create comments
      [],
    );
    const glThread = new GitLabCommentThread(vsThread, discussion);
    vsThread.comments = discussion.notes.nodes.map(note =>
      GitLabComment.fromGqlNote(note, glThread),
    );
    return glThread;
  }
}
