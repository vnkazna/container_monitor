import * as vscode from 'vscode';
import * as assert from 'assert';
import {
  GitLabNewService,
  GqlNote,
  GqlTextDiffDiscussion,
  GqlTextDiffNote,
  GqlTextPosition,
} from '../gitlab/gitlab_new_service';
import { GitLabComment } from './gitlab_comment';
import { toReviewUri } from './review_uri';

const firstNoteFrom = (discussion: GqlTextDiffDiscussion): GqlTextDiffNote => {
  const note = discussion.notes.nodes[0];
  assert(note, 'discussion should contain at least one note');
  return note;
};

const isDiffNote = (note: GqlNote): note is GqlTextDiffNote => {
  return Boolean(note.position && note.position.positionType === 'text');
};

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
  const onOldVersion = position.oldLine !== null;
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
  mr: RestIssuable;
  discussion: GqlTextDiffDiscussion;
  gitlabService: GitLabNewService;
}

export class GitLabCommentThread {
  private resolved: boolean;

  private constructor(
    private vsThread: vscode.CommentThread,
    private gqlDiscussion: GqlTextDiffDiscussion,
    private gitlabService: GitLabNewService,
    private mr: RestIssuable,
  ) {
    this.vsThread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    this.vsThread.canReply = firstNoteFrom(gqlDiscussion).userPermissions.createNote;
    this.resolved = gqlDiscussion.resolved;
    this.updateThreadContext();
  }

  async toggleResolved(): Promise<void> {
    await this.gitlabService.setResolved(this.gqlDiscussion.replyId, !this.resolved);
    this.resolved = !this.resolved;
    this.updateThreadContext();
  }

  private allowedToResolve(): boolean {
    const [firstNote] = this.gqlDiscussion.notes.nodes;
    assert(firstNote);
    return firstNote.userPermissions.resolveNote;
  }

  async deleteComment(comment: GitLabComment): Promise<void> {
    await this.gitlabService.deleteNote(comment.id);
    this.vsThread.comments = this.vsThread.comments.filter(c => {
      if (c instanceof GitLabComment) return c.id !== comment.id;
      return true;
    });
    if (this.vsThread.comments.length === 0) {
      this.dispose();
    }
  }

  startEdit(comment: GitLabComment): void {
    this.changeOneComment(comment.id, c => c.withMode(vscode.CommentMode.Editing));
  }

  cancelEdit(comment: GitLabComment): void {
    this.changeOneComment(comment.id, c => c.withMode(vscode.CommentMode.Preview).resetBody());
  }

  async submitEdit(comment: GitLabComment): Promise<void> {
    await this.gitlabService.updateNoteBody(
      comment.id,
      comment.body,
      comment.gqlNote.body, // this is what we think is the latest version stored in API
      this.mr,
    );
    this.changeOneComment(comment.id, c =>
      c.markBodyAsSubmitted().withMode(vscode.CommentMode.Preview),
    );
  }

  async reply(text: string): Promise<void> {
    const note = await this.gitlabService.createNote(this.mr, text, this.gqlDiscussion.replyId);
    assert(isDiffNote(note));
    this.vsThread.comments = [...this.vsThread.comments, GitLabComment.fromGqlNote(note, this)];
    // prevent mutating existing API response by making deeper copy
    this.gqlDiscussion = {
      ...this.gqlDiscussion,
      notes: {
        nodes: [...this.gqlDiscussion.notes.nodes, note],
      },
    };
  }

  private changeOneComment(id: string, changeFn: (c: GitLabComment) => GitLabComment): void {
    this.vsThread.comments = this.vsThread.comments.map(c => {
      if (c instanceof GitLabComment && c.id === id) {
        return changeFn(c);
      }
      return c;
    });
  }

  private updateThreadContext() {
    // when user doesn't have permission to resolve the discussion we don't show the
    // resolve/unresolve buttons at all (`context` stays `undefined`) because otherwise
    // user would be presented with buttons that don't do anything when clicked
    if (this.gqlDiscussion.resolvable && this.allowedToResolve()) {
      this.vsThread.contextValue = this.resolved ? 'resolved' : 'unresolved';
    }
  }

  dispose(): void {
    this.vsThread.dispose();
  }

  static createThread({
    commentController,
    workspaceFolder,
    mr,
    discussion,
    gitlabService,
  }: CreateThreadOptions): GitLabCommentThread {
    const { position } = firstNoteFrom(discussion);
    const vsThread = commentController.createCommentThread(
      uriFromPosition(position, workspaceFolder, mr.project_id),
      commentRangeFromPosition(position),
      // the comments need to know about the thread, so we first
      // create empty thread to be able to create comments
      [],
    );
    const glThread = new GitLabCommentThread(vsThread, discussion, gitlabService, mr);
    vsThread.comments = discussion.notes.nodes.map(note =>
      GitLabComment.fromGqlNote(note, glThread),
    );
    return glThread;
  }
}
