import * as vscode from 'vscode';
import { fromReviewUri, toReviewUri } from './review_uri';

jest.mock('vscode');

describe('review_uri.ts', () => {
  const uri = {
    path: '/review',
    query: '{"commit":"abcdef","workspacePath":"https://gitlab-example.com/test","projectId":1234}',
    scheme: 'gl-review',
  };

  const params = {
    commit: 'abcdef',
    path: '/review',
    projectId: 1234,
    workspacePath: 'https://gitlab-example.com/test',
  };

  describe('toReviewUri', () => {
    it('returns the correct Uri', () => {
      const result = toReviewUri(params);

      expect(result).toEqual(uri);
    });
  });

  describe('fromReviewUri', () => {
    it('returns the correct string', () => {
      const result = fromReviewUri(uri as vscode.Uri);

      expect(result).toEqual(params);
    });
  });
});
