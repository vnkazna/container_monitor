import * as vscode from 'vscode';
import { SYNCED_COMMENT_CONTEXT } from '../constants';
import { GqlTextDiffNote } from '../gitlab/graphql/shared';
import { GitLabCommentThread } from './gitlab_comment_thread';

interface CommentOptions {
  mode?: vscode.CommentMode;
  body?: string;
  note?: GqlTextDiffNote;
}

const renderSuggestions = (body: string, noteUrl: string): string =>
  body.replace(
    /```suggestion:-\d+\+\d+\n((?:\n|.)*?)\n```/g,
    (_, p1) =>
      `---\n\nSuggestion:\n\n\`\`\`diff\n+ ${p1.replace(
        /\n/,
        '\n+ ',
      )}\n\`\`\`\n\n*[open suggestion on the web](${noteUrl})*\n\n---\n\n`,
  );

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
    return `${SYNCED_COMMENT_CONTEXT}${
      this.gqlNote.userPermissions.adminNote ? ';canAdmin' : undefined
    }`;
  }

  get author(): vscode.CommentAuthorInformation {
    const { name, avatarUrl } = this.gqlNote.author;
    return {
      name,
      iconPath: avatarUrl !== null ? vscode.Uri.parse(avatarUrl) : undefined,
    };
  }

  renderBody(): GitLabComment {
    return this.copyWith({ body: renderSuggestions(this.gqlNote.body, this.gqlNote.url) });
  }

  setOriginalBody(): GitLabComment {
    return this.copyWith({ body: this.gqlNote.body });
  }

  markBodyAsSubmitted(): GitLabComment {
    return this.copyWith({
      note: {
        ...this.gqlNote,
        body: this.body, // this synchronizes the API response with the latest body
      },
    }).renderBody();
  }

  withMode(mode: vscode.CommentMode): GitLabComment {
    return this.copyWith({ mode });
  }

  private copyWith({ mode, body, note }: CommentOptions) {
    return new GitLabComment(
      note ?? this.gqlNote,
      mode ?? this.mode,
      this.thread,
      body ?? this.body,
    );
  }

  static fromGqlNote(gqlNote: GqlTextDiffNote, thread: GitLabCommentThread): GitLabComment {
    return new GitLabComment(
      gqlNote,
      vscode.CommentMode.Preview,
      thread,
      renderSuggestions(gqlNote.body, gqlNote.url),
    );
  }
}
