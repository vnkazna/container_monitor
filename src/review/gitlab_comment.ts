import * as vscode from 'vscode';
import { GqlTextDiffNote } from '../gitlab/gitlab_new_service';

export class GitLabComment implements vscode.Comment {
  protected constructor(readonly gqlNote: GqlTextDiffNote, public mode: vscode.CommentMode) {}

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

  static fromGqlNote(gqlNote: GqlTextDiffNote): GitLabComment {
    return new GitLabComment(gqlNote, vscode.CommentMode.Preview);
  }
}
