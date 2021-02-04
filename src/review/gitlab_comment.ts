import * as vscode from 'vscode';
import { GqlNote } from '../gitlab/gitlab_new_service';

export class GitLabComment implements vscode.Comment {
  constructor(readonly gqlNote: GqlNote, readonly thread: vscode.CommentThread) {}

  get id(): string {
    return this.gqlNote.id;
  }

  get body(): string {
    return this.gqlNote.body;
  }

  mode: vscode.CommentMode = vscode.CommentMode.Preview;

  get author(): vscode.CommentAuthorInformation {
    const { name, avatarUrl } = this.gqlNote.author;
    return {
      name,
      iconPath: avatarUrl !== null ? vscode.Uri.parse(avatarUrl) : undefined,
    };
  }

  get contextValue(): string | undefined {
    return this.gqlNote.userPermissions.adminNote ? 'canAdmin' : undefined;
  }

  reactions: undefined;

  label: undefined;

  startEdit(): void {
    const updatedComments = this.thread.comments.map(comment => {
      if (comment instanceof GitLabComment && comment.id === this.id) {
        const editedComment = new GitLabComment(comment.gqlNote, this.thread);
        editedComment.mode = vscode.CommentMode.Editing;
        return editedComment;
      }
      return comment;
    });
    this.thread.comments = updatedComments;
  }
}
