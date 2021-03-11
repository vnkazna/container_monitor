import { reviewUriParams } from '../test_utils/entities';
import { fromReviewUri, toReviewUri } from './review_uri';

describe('review_uri.ts', () => {
  describe('toReviewUri', () => {
    it('returns the correct Uri', () => {
      const result = toReviewUri(reviewUriParams);

      expect(result.toString()).toEqual(
        'gl-review:///review{"commit":"abcdef","workspacePath":"path/to/workspace","projectId":1234}#',
      );
    });
  });

  describe('fromReviewUri', () => {
    it('returns the correct string', () => {
      const result = fromReviewUri(toReviewUri(reviewUriParams));

      expect(result).toEqual(reviewUriParams);
    });
  });
});
