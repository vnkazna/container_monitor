import * as vscode from 'vscode';
import * as assert from 'assert';
import { GqlNote, GqlPosition } from '../gitlab/gitlab_new_service';
import { GitLabComment } from './gitlab_comment';

const commentRangeFromPosition = (position: GqlPosition): vscode.Range => {
  const glLine = position.oldLine || position.newLine;
  assert(glLine, 'there is always eitehr new or old line');
  const vsPosition = new vscode.Position(glLine - 1, 0);
  return new vscode.Range(vsPosition, vsPosition);
};

export class GitLabCommentThread {
  private vsThread: vscode.CommentThread;

  constructor(
    commentController: vscode.CommentController,
    notes: GqlNote[],
    threadUri: vscode.Uri,
  ) {
    const position = notes[0]?.position;
    assert(position, 'thread cannot be created for notes without position');
    this.vsThread = commentController.createCommentThread(
      threadUri,
      commentRangeFromPosition(position),
      [],
    );
    this.vsThread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    const comments = notes.map(gqlNote => new GitLabComment(gqlNote, this));
    this.vsThread.comments = comments;
  }

  startEdit(comment: GitLabComment): void {
    this.changeCommentMode(comment, vscode.CommentMode.Editing);
  }

  cancelEdit(comment: GitLabComment): void {
    this.changeCommentMode(comment, vscode.CommentMode.Preview);
  }

  submitEdit(comment: GitLabComment): void {
    // const updatedComments = this.vsThread.comments.map(c => {
    //   if (c instanceof GitLabComment && c.id === comment.id) {
    //     console.log(`existingBody: ${c.body}; command arg body: ${comment.body}`);
    //     const editedComment = new GitLabComment(c.gqlNote, this);
    //     editedComment.body = comment.body;
    //     return editedComment;
    //   }
    //   return comment;
    // });
    // this.vsThread.comments = updatedComments;
  }

  private changeCommentMode(comment: GitLabComment, mode: vscode.CommentMode) {
    const updatedComments = this.vsThread.comments.map(c => {
      if (c instanceof GitLabComment && c.id === comment.id) {
        const editedComment = new GitLabComment(c.gqlNote, this);
        editedComment.mode = mode;
        return editedComment;
      }
      return comment;
    });
    this.vsThread.comments = updatedComments;
  }

  dispose(): void {
    this.vsThread.dispose();
  }

  static isThreadOnDiff(notes: GqlNote[]): boolean {
    const firstNote = notes[0];
    return firstNote?.position?.positionType === 'text';
  }
}
