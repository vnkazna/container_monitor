import * as vscode from 'vscode';
import { MrItemModel } from './mr_item_model';
import { mr } from '../../test_utils/entities';
import {
  discussionOnDiff,
  noteOnDiffTextSnippet,
  multipleNotes,
} from '../../../test/integration/fixtures/graphql/discussions.js';
import * as mrVersion from '../../../test/integration/fixtures/rest/mr_version.json';
import { CommentingRangeProvider } from '../../review/commenting_range_provider';
import { createWrappedRepository } from '../../test_utils/create_wrapped_repository';
import { fromReviewUri } from '../../review/review_uri';
import { WrappedRepository } from '../../git/wrapped_repository';
import { CHANGE_TYPE_QUERY_KEY, HAS_COMMENTS_QUERY_KEY } from '../../constants';

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

  it('should return changed file items as children', async () => {
    gitLabService.getMrDiff = jest.fn().mockResolvedValue(mrVersion);
    const [overview, changedItem] = await item.getChildren();
    expect(changedItem.resourceUri?.path).toBe('.deleted.yml');
    expect(changedItem.resourceUri?.query).toMatch(`${CHANGE_TYPE_QUERY_KEY}=deleted`);
    expect(changedItem.resourceUri?.query).toMatch(`${HAS_COMMENTS_QUERY_KEY}=false`);
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

    it('keeps the same commentController regardless how many times we call getChildren', async () => {
      await item.getChildren();

      expect(createCommentControllerMock).toHaveBeenCalledTimes(1);

      await item.getChildren();

      expect(createCommentControllerMock).toHaveBeenCalledTimes(1);
      expect(commentController.dispose).not.toHaveBeenCalled();
    });
  });
});
