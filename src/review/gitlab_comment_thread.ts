import * as vscode from 'vscode';
import * as assert from 'assert';
import { GitLabNewService, GqlNote, GqlPosition } from '../gitlab/gitlab_new_service';
import { CommentCopyOptions, GitLabComment } from './gitlab_comment';

const commentRangeFromPosition = (position: GqlPosition): vscode.Range => {
  const glLine = position.oldLine || position.newLine;
  assert(glLine, 'there is always eitehr new or old line');
  const vsPosition = new vscode.Position(glLine - 1, 0);
  return new vscode.Range(vsPosition, vsPosition);
};

interface GitLabCommentThreadOptions {
  notes: GqlNote[];
  threadUri: vscode.Uri;
  resolved: boolean;
  resolvable: boolean;
  replyId: string;
}

export class GitLabCommentThread {
  private vsThread: vscode.CommentThread;

  private readonly resolvable: boolean;

  private resolved: boolean;

  private replyId: string;

  constructor(
    commentController: vscode.CommentController,
    private readonly gitlabService: GitLabNewService,
    options: GitLabCommentThreadOptions,
  ) {
    const position = options.notes[0]?.position;
    assert(position, 'thread cannot be created for notes without position');
    this.vsThread = commentController.createCommentThread(
      options.threadUri,
      commentRangeFromPosition(position),
      [],
    );
    this.vsThread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    const comments = options.notes.map(gqlNote => GitLabComment.fromGqlNote(gqlNote, this));
    this.vsThread.comments = comments;
    this.resolvable = options.resolvable;
    this.resolved = options.resolved;
    this.replyId = options.replyId;
    this.vsThread.contextValue = this.createContext();
  }

  startEdit(comment: GitLabComment): void {
    this.changeComment(comment, { mode: vscode.CommentMode.Editing });
  }

  cancelEdit(comment: GitLabComment): void {
    this.changeComment(comment, { mode: vscode.CommentMode.Preview, body: comment.bodyOnServer });
  }

  async submitEdit(comment: GitLabComment): Promise<void> {
    await this.gitlabService.updateNoteBody(comment.id, comment.body);
    this.changeComment(comment, {
      mode: vscode.CommentMode.Preview,
      body: comment.body,
      bodyOnServer: comment.body,
    });
  }

  async toggleResolved(): Promise<void> {
    await this.gitlabService.setResolved(this.replyId, !this.resolved);
    this.resolved = !this.resolved;
    this.vsThread.contextValue = this.createContext();
  }

  private changeComment(comment: GitLabComment, options: CommentCopyOptions) {
    const updatedComments = this.vsThread.comments.map(c => {
      if (c instanceof GitLabComment && c.id === comment.id) {
        return c.copy(options);
      }
      return c;
    });
    this.vsThread.comments = updatedComments;
  }

  private createContext(): string | undefined {
    if (!this.resolvable) return undefined;
    return `${this.resolved ? 'resolved' : 'unresolved'}`;
  }

  dispose(): void {
    this.vsThread.dispose();
  }

  static isThreadOnDiff(notes: GqlNote[]): boolean {
    const firstNote = notes[0];
    return firstNote?.position?.positionType === 'text';
  }
}
