import * as vscode from 'vscode';
import { createReviewUri } from '../test_utils/entities';
import { fromReviewUri, toReviewUri } from './review_uri';

describe('review_uri.ts', () => {
  const params = {
    commit: 'abcdef',
    path: '/review',
    projectId: 1234,
    workspacePath: 'path/to/workspace',
  };

  const uri = createReviewUri(params);

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
