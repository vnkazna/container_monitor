import * as vscode from 'vscode';
import { GqlTextDiffNote } from '../gitlab/gitlab_new_service';
import { GitLabCommentThread } from './gitlab_comment_thread';

interface CommentOptions {
  mode?: vscode.CommentMode;
  body?: string;
}

export class GitLabComment implements vscode.Comment {
  protected constructor(
    readonly gqlNote: GqlTextDiffNote,
    public mode: vscode.CommentMode,
    readonly thread: GitLabCommentThread,
    public body: string,
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

  resetBody(): GitLabComment {
    return this.with({ body: this.gqlNote.body });
  }

  withMode(mode: vscode.CommentMode): GitLabComment {
    return this.with({ mode });
  }

  private with({ mode, body }: CommentOptions) {
    return new GitLabComment(this.gqlNote, mode ?? this.mode, this.thread, body ?? this.body);
  }

  static fromGqlNote(gqlNote: GqlTextDiffNote, thread: GitLabCommentThread): GitLabComment {
    return new GitLabComment(gqlNote, vscode.CommentMode.Preview, thread, gqlNote.body);
  }
}
