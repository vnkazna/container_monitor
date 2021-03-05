import * as vscode from 'vscode';
import { GqlTextDiffNote } from '../gitlab/gitlab_new_service';
import { GitLabCommentThread } from './gitlab_comment_thread';

export class GitLabComment implements vscode.Comment {
  protected constructor(
    readonly gqlNote: GqlTextDiffNote,
    public mode: vscode.CommentMode,
    readonly thread: GitLabCommentThread,
  ) {}

  get id(): string {
    return this.gqlNote.id;
  }

  get contextValue(): string | undefined {
    return this.gqlNote.userPermissions.adminNote ? 'canAdmin' : undefined;
  }

  get author(): vscode.CommentAuthorInformation {
    const { name, avatarUrl } = this.gqlNote.author;
    return {
      name,
      iconPath: avatarUrl !== null ? vscode.Uri.parse(avatarUrl) : undefined,
    };
  }

  get body(): string {
    return this.gqlNote.body;
  }

  static fromGqlNote(gqlNote: GqlTextDiffNote, thread: GitLabCommentThread): GitLabComment {
    return new GitLabComment(gqlNote, vscode.CommentMode.Preview, thread);
  }
}
