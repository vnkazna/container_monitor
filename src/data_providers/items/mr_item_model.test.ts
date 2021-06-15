import * as vscode from 'vscode';
import { MrItemModel } from './mr_item_model';
import { mr } from '../../test_utils/entities';
import {
  discussionOnDiff,
  noteOnDiffTextSnippet,
  multipleNotes,
} from '../../../test/integration/fixtures/graphql/discussions.js';
import { CommentingRangeProvider } from '../../review/commenting_range_provider';
import { createWrappedRepository } from '../../test_utils/create_wrapped_repository';

const createCommentControllerMock = vscode.comments.createCommentController as jest.Mock;

describe('MrItemModel', () => {
  let item: MrItemModel;
  let commentThread: vscode.CommentThread;
  let canUserCommentOnMr = false;
  let commentController: any;
  let gitLabService: any;

  const createCommentThreadMock = jest.fn();

  beforeEach(() => {
    gitLabService = {
      getDiscussions: jest.fn().mockResolvedValue([discussionOnDiff, multipleNotes]),
      getMrDiff: jest.fn().mockResolvedValue({ diffs: [] }),
      canUserCommentOnMr: jest.fn(async () => canUserCommentOnMr),
    };
    const repository = createWrappedRepository({
      gitLabService,
    });
    item = new MrItemModel(mr, repository);
    commentThread = {} as vscode.CommentThread;

    commentController = {
      createCommentThread: createCommentThreadMock.mockReturnValue(commentThread),
      dispose: jest.fn(),
    };
    createCommentControllerMock.mockReturnValue(commentController);
  });

  afterEach(() => {
    createCommentControllerMock.mockReset();
    createCommentThreadMock.mockReset();
  });

  it('should add comment thread to VS Code', async () => {
    await item.getChildren();
    expect(createCommentControllerMock).toBeCalledWith(
      'gitlab-mr-gitlab-org/gitlab!2000',
      'Issuable Title',
    );
    const [uri, range] = createCommentThreadMock.mock.calls[0];
    expect(uri.path).toBe('src/webview/src/components/LabelNoteOld.vue');
    expect(range.start.line).toBe(47);
    expect(commentThread.comments.length).toBe(1);
    const firstComment = commentThread.comments[0];
    expect(firstComment.author.name).toBe('Tomas Vik');
    expect(firstComment.mode).toBe(vscode.CommentMode.Preview);
    expect(firstComment.body).toMatch(noteOnDiffTextSnippet);
  });

  describe('commenting range', () => {
    it('should not add a commenting range provider if user does not have permission to comment', async () => {
      canUserCommentOnMr = false;

      await item.getChildren();

      expect(commentController.commentingRangeProvider).toBe(undefined);
    });

    it('should add a commenting range provider if user has permission to comment', async () => {
      canUserCommentOnMr = true;

      await item.getChildren();

      expect(commentController.commentingRangeProvider).toBeInstanceOf(CommentingRangeProvider);
    });

    // this test ensures that we add comment controller to disposables before calling API.
    it('comment controller can be disposed regardless of API failures', async () => {
      gitLabService.getDiscussions = () => Promise.reject(new Error());

      await item.getChildren();

      expect(commentController.dispose).not.toHaveBeenCalled();
      item.dispose();
      expect(commentController.dispose).toHaveBeenCalled();
    });

    it('when we create comment controller for the same MR, we dispose the previously created controller', async () => {
      await item.getChildren();

      expect(commentController.dispose).not.toHaveBeenCalled();

      // simulates another MR item opening the same MR
      await item.getChildren();

      expect(commentController.dispose).toHaveBeenCalled();
    });
  });
});
