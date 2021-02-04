import * as vscode from 'vscode';
import { GqlNote } from '../gitlab/gitlab_new_service';
import { GitLabCommentThread } from './gitlab_comment_thread';

export class GitLabComment implements vscode.Comment {
  constructor(readonly gqlNote: GqlNote, readonly thread: GitLabCommentThread) {}

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
}
