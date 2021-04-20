import * as vscode from 'vscode';
import { mr, mrVersion } from '../test_utils/entities';
import { CommentingRangeProvider } from './commenting_range_provider';
import { toReviewUri } from './review_uri';

describe('CommentingRangeProvider', () => {
  let commentingRangeProvider: CommentingRangeProvider;

  beforeEach(() => {
    commentingRangeProvider = new CommentingRangeProvider(mr, mrVersion);
  });

  it('returns empty array for different URI schema', () => {
    const testDocument = {
      uri: vscode.Uri.parse('https://example.com'),
    } as vscode.TextDocument;
    expect(commentingRangeProvider.provideCommentingRanges(testDocument)).toEqual([]);
  });

  it('returns full range (all lines in the document) for old file', () => {
    const testDocument = {
      uri: toReviewUri({
        path: `/path`,
        mrId: mr.id,
        projectId: mr.project_id,
        commit: mrVersion.base_commit_sha,
        workspacePath: '/',
      }),
      lineCount: 200,
    } as vscode.TextDocument;
    expect(commentingRangeProvider.provideCommentingRanges(testDocument)).toEqual([
      new vscode.Range(new vscode.Position(0, 0), new vscode.Position(199, 0)),
    ]);
  });

  it('returns empty array for new file', () => {
    const testDocument = {
      uri: toReviewUri({
        path: `/path`,
        mrId: mr.id,
        projectId: mr.project_id,
        commit: mrVersion.head_commit_sha,
        workspacePath: '/',
      }),
      lineCount: 200,
    } as vscode.TextDocument;
    expect(commentingRangeProvider.provideCommentingRanges(testDocument)).toEqual([]);
  });
});
