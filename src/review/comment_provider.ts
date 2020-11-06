import * as vscode from 'vscode';
import { REVIEW_URI_SCHEME } from '../constants';

export class ReviewCommentController implements vscode.Disposable, vscode.CommentingRangeProvider {
  dispose() {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line
  provideCommentingRanges(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Range[]> {
    if (document.uri.scheme === REVIEW_URI_SCHEME) {
      return [
        new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount - 1, 0)),
      ];
    }
  }
}
