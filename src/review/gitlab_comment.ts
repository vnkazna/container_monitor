import * as vscode from 'vscode';
import { GqlNote } from '../gitlab/gitlab_new_service';
import { GitLabCommentThread } from './gitlab_comment_thread';

export class GitLabComment implements vscode.Comment {
  body: string;

  constructor(readonly gqlNote: GqlNote, readonly thread: GitLabCommentThread) {
    this.body = gqlNote.body;
  }

  get id(): string {
    return this.gqlNote.id;
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
}
