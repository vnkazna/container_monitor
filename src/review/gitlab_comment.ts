import * as vscode from 'vscode';
import { GqlNote } from '../gitlab/gitlab_new_service';
import { GitLabCommentThread } from './gitlab_comment_thread';

export interface CommentCopyOptions {
  body?: string;
  bodyOnServer?: string;
  mode?: vscode.CommentMode;
}
export class GitLabComment implements vscode.Comment {
  protected constructor(
    readonly gqlNote: GqlNote,
    public mode: vscode.CommentMode,
    // The body on server is necessary because we might want to cancel editing and then we need to
    // be able to revert to original state. If submitting gives us a new GqlNote, we could avoid keeping this state 🙏
    readonly bodyOnServer: string,
    public body: string,
    readonly thread: GitLabCommentThread,
  ) {}

  get id(): string {
    return this.gqlNote.id;
  }

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

  copy({ body, bodyOnServer, mode }: CommentCopyOptions): GitLabComment {
    return new GitLabComment(
      this.gqlNote,
      mode ?? this.mode,
      bodyOnServer ?? this.bodyOnServer,
      body ?? this.body,
      this.thread,
    );
  }

  static fromGqlNote(gqlNote: GqlNote, thread: GitLabCommentThread): GitLabComment {
    return new GitLabComment(
      gqlNote,
      vscode.CommentMode.Preview,
      gqlNote.body,
      gqlNote.body,
      thread,
    );
  }
}
