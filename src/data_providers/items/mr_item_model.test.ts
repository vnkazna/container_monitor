import * as vscode from 'vscode';
import { MrItemModel } from './mr_item_model';
import { mr, project } from '../../test_utils/entities';
import {
  discussionOnDiff,
  noteOnDiffTextSnippet,
  multipleNotes,
} from '../../../test/integration/fixtures/graphql/discussions.js';
import { createGitLabNewService } from '../../service_factory';

jest.mock('../../service_factory');

const createCommentControllerMock = vscode.comments.createCommentController as jest.Mock;
const createGitLabNewServiceMock = createGitLabNewService as jest.Mock;

describe('MrItemModel', () => {
  let item: MrItemModel;
  let commentThread: vscode.CommentThread;

  const createCommentThreadMock = jest.fn();

  beforeEach(() => {
    item = new MrItemModel(mr, project);
    commentThread = {} as vscode.CommentThread;

    createCommentControllerMock.mockReturnValue({
      createCommentThread: createCommentThreadMock.mockReturnValue(commentThread),
    });
    createGitLabNewServiceMock.mockReturnValue({
      getDiscussions: jest.fn().mockResolvedValue([discussionOnDiff, multipleNotes]),
      getMrDiff: jest.fn().mockResolvedValue({ diffs: [] }),
    });
  });

  afterEach(() => {
    createCommentControllerMock.mockReset();
    createCommentThreadMock.mockReset();
  });

  it('should add comment thread to VS Code', async () => {
    await item.getChildren();
    expect(createCommentControllerMock).toBeCalledWith('gitlab-org/gitlab!2000', 'Issuable Title');
    const [uri, range] = createCommentThreadMock.mock.calls[0];
    expect(uri.path).toBe('src/webview/src/components/LabelNote.vue');
    expect(range.start.x).toBe(47);
    expect(commentThread.comments.length).toBe(2);
    const firstComment = commentThread.comments[0];
    expect(firstComment.author.name).toBe('Tomas Vik');
    expect(firstComment.mode).toBe(vscode.CommentMode.Preview);
    expect(firstComment.body).toMatch(noteOnDiffTextSnippet);
  });
});
