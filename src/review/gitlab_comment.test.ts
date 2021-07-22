import { GitLabComment } from './gitlab_comment';
import { GitLabCommentThread } from './gitlab_comment_thread';
import { noteOnDiff } from '../../test/integration/fixtures/graphql/discussions.js';
import { GqlTextDiffNote } from '../gitlab/graphql/shared';

describe('GitLabComment', () => {
  let comment: GitLabComment;

  const createGitLabComment = (note: GqlTextDiffNote) => {
    comment = GitLabComment.fromGqlNote(note, {} as GitLabCommentThread);
  };

  beforeEach(() => {
    createGitLabComment(noteOnDiff as GqlTextDiffNote);
  });
  describe('context', () => {
    it('sets context to canAdmin if the user can edit the comment', () => {
      expect(comment.contextValue).toMatch('canAdmin');
    });

    it('leaves the context undefined if the user cannot edit the comment', () => {
      createGitLabComment({
        ...(noteOnDiff as GqlTextDiffNote),
        userPermissions: {
          ...noteOnDiff.userPermissions,
          adminNote: false, // user can't edit
        },
      });
      expect(comment.contextValue).not.toMatch('canAdmin');
    });
  });
});
