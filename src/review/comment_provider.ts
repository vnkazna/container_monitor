import * as vscode from 'vscode';
import { REVIEW_URI_SCHEME } from '../constants';
import { parseUriQuery } from '../utils/parse_uri_query';

export class ReviewCommentController implements vscode.Disposable, vscode.CommentingRangeProvider {
  dispose() {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line
  provideCommentingRanges(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Range[]> {
    const { version } = parseUriQuery(document.uri.query);
    if (document.uri.scheme === REVIEW_URI_SCHEME && version === 'base') {
      return [
        new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount - 1, 0)),
      ];
    }
    return [];
  }
}
