import * as vscode from 'vscode';
import { FF_COMMENTING_RANGES, REVIEW_URI_SCHEME } from '../constants';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';
import { fromReviewUri } from './review_uri';

export class CommentingRangeProvider implements vscode.CommentingRangeProvider {
  private mr: RestIssuable;

  private mrVersion: RestMrVersion;

  constructor(mr: RestIssuable, mrVersion: RestMrVersion) {
    this.mr = mr;
    this.mrVersion = mrVersion;
  }

  provideCommentingRanges(document: vscode.TextDocument): vscode.Range[] {
    if (!getExtensionConfiguration().featureFlags?.includes(FF_COMMENTING_RANGES)) return [];
    const { uri } = document;
    if (uri.scheme !== REVIEW_URI_SCHEME) return [];
    const params = fromReviewUri(uri);
    if (params.mrId !== this.mr.id || params.projectId !== this.mr.project_id || !params.path) {
      return [];
    }
    const oldFile = params.commit === this.mrVersion.base_commit_sha;
    if (oldFile) {
      return [
        new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount - 1, 0)),
      ];
    }

    return [];
  }
}
