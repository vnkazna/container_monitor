import * as vscode from 'vscode';
import { GitLabCommentThread } from './gitlab_comment_thread';
import {
  discussionOnDiff,
  noteOnDiff,
} from '../../test/integration/fixtures/graphql/discussions.js';
import { GitLabComment } from './gitlab_comment';
import { GitLabNewService, GqlTextDiffDiscussion } from '../gitlab/gitlab_new_service';

describe('GitLabCommentThread', () => {
  let gitlabCommentThread: GitLabCommentThread;
  let vsCommentThread: vscode.CommentThread;
  let gitlabService: GitLabNewService;

  const createGitLabCommentThread = (discussion: GqlTextDiffDiscussion) => {
    const fakeCommentController: vscode.CommentController = {
      id: 'id',
      label: 'label',
      dispose: () => undefined,
      createCommentThread: (uri, range, comments) => {
        vsCommentThread = {
          uri,
          range,
          comments,
          collapsibleState: vscode.CommentThreadCollapsibleState.Collapsed,
          canReply: true,
          dispose: () => undefined,
        };
        return vsCommentThread;
      },
    };
    gitlabService = ({
      setResolved: jest.fn(),
    } as unknown) as GitLabNewService;
    gitlabCommentThread = GitLabCommentThread.createThread({
      commentController: fakeCommentController,
      workspaceFolder: '/workspaceFolder',
      gitlabProjectId: 12345,
      discussion,
      gitlabService,
    });
  };

  beforeEach(() => {
    createGitLabCommentThread(discussionOnDiff as GqlTextDiffDiscussion);
  });

  it('sets collapsible state on the VS thread', () => {
    expect(vsCommentThread.collapsibleState).toBe(vscode.CommentThreadCollapsibleState.Expanded);
  });

  it('sets canReply on the VS thread', () => {
    expect(vsCommentThread.canReply).toBe(false);
  });

  it('takes position from the first note', () => {
    expect(vsCommentThread.range.start.line).toBe(noteOnDiff.position.oldLine - 1); // vs code numbers lines from 0
  });

  describe('resolving discussions', () => {
    it('sets context to unresolved', () => {
      expect(vsCommentThread.contextValue).toBe('unresolved');
    });

    it('sets context to resolved', () => {
      createGitLabCommentThread({ ...(discussionOnDiff as GqlTextDiffDiscussion), resolved: true });
      expect(vsCommentThread.contextValue).toBe('resolved');
    });

    it('toggles resolved', async () => {
      (gitlabService.setResolved as jest.Mock).mockResolvedValue(undefined);

      await gitlabCommentThread.toggleResolved();

      expect(vsCommentThread.contextValue).toBe('resolved');
      expect(gitlabService.setResolved).toHaveBeenLastCalledWith(discussionOnDiff.replyId, true);
    });

    it('does not toggle resolved if API call failed', async () => {
      const error = new Error();
      (gitlabService.setResolved as jest.Mock).mockRejectedValue(error);

      expect(gitlabCommentThread.toggleResolved()).rejects.toBe(error);

      expect(vsCommentThread.contextValue).toBe('unresolved');
    });

    it("doesn't populate the context if user doesn't have permission to resolve the note", () => {
      const discussionWithoutPermission = {
        ...discussionOnDiff,
        notes: {
          ...discussionOnDiff.notes,
          nodes: [
            {
              ...noteOnDiff,
              userPermissions: {
                ...noteOnDiff.userPermissions,
                resolveNote: false,
              },
            },
          ],
        },
      } as GqlTextDiffDiscussion;

      createGitLabCommentThread(discussionWithoutPermission);

      expect(vsCommentThread.contextValue).toBe(undefined);
    });
  });

  it('creates GitLabComments', () => {
    expect(vsCommentThread.comments.length).toBe(1);
    const [comment] = vsCommentThread.comments;
    expect(comment).toBeInstanceOf(GitLabComment);
    expect((comment as GitLabComment).body).toBe(noteOnDiff.body);
  });
});
