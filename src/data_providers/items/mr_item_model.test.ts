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
import { fromReviewUri } from '../../review/review_uri';
import { WrappedRepository } from '../../git/wrapped_repository';

const createCommentControllerMock = vscode.comments.createCommentController as jest.Mock;

describe('MrItemModel', () => {
  let item: MrItemModel;
  let commentThread: vscode.CommentThread;
  let canUserCommentOnMr = false;
  let commentController: any;
  let gitLabService: any;
  let repository: WrappedRepository;

  const createCommentThreadMock = jest.fn();

  beforeEach(() => {
    gitLabService = {
      getDiscussions: jest.fn().mockResolvedValue([discussionOnDiff, multipleNotes]),
      getMrDiff: jest.fn().mockResolvedValue({ diffs: [] }),
      canUserCommentOnMr: jest.fn(async () => canUserCommentOnMr),
    };
    repository = createWrappedRepository({
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

  describe('MR item context', () => {
    it('should return return correct context when MR comes from the same project', () => {
      item = new MrItemModel(
        { ...mr, source_project_id: 1234, target_project_id: 1234 },
        repository,
      );
      expect(item.getTreeItem().contextValue).toBe('mr-item-from-same-project');
    });

    it('should return return correct context when MR comes from a fork', () => {
      item = new MrItemModel(
        { ...mr, source_project_id: 5678, target_project_id: 1234 },
        repository,
      );
      expect(item.getTreeItem().contextValue).toBe('mr-item-from-fork');
    });
  });

  it('should add comment thread to VS Code', async () => {
    await item.getChildren();
    expect(createCommentControllerMock).toBeCalledWith(
      'gitlab-mr-gitlab-org/gitlab!2000',
      'Issuable Title',
    );
    const [_, range] = createCommentThreadMock.mock.calls[0];
    expect(range.start.line).toBe(47);
    expect(commentThread.comments.length).toBe(1);
    const firstComment = commentThread.comments[0];
    expect(firstComment.author.name).toBe('Tomas Vik');
    expect(firstComment.mode).toBe(vscode.CommentMode.Preview);
    expect(firstComment.body).toMatch(noteOnDiffTextSnippet);
  });

  it('should associate the thread with the correct URI', async () => {
    await item.getChildren();

    const [uri] = createCommentThreadMock.mock.calls[0];
    const { mrId, projectId, repositoryRoot, commit, path } = fromReviewUri(uri);
    expect(mrId).toBe(mr.id);
    expect(projectId).toBe(mr.project_id);
    expect(repositoryRoot).toBe(repository.rootFsPath);

    const discussionPosition = discussionOnDiff.notes.nodes[0].position;
    expect(commit).toBe(discussionPosition.diffRefs.baseSha);
    expect(path).toBe(discussionPosition.oldPath);
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
