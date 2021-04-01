import * as vscode from 'vscode';
import { GitLabCommentThread } from './gitlab_comment_thread';
import {
  discussionOnDiff,
  noteOnDiff,
} from '../../test/integration/fixtures/graphql/discussions.js';
import { GitLabComment } from './gitlab_comment';
import {
  GitLabNewService,
  GqlTextDiffDiscussion,
  GqlTextDiffNote,
} from '../gitlab/gitlab_new_service';
import { mr } from '../test_utils/entities';

describe('GitLabCommentThread', () => {
  let gitlabCommentThread: GitLabCommentThread;
  let vsCommentThread: vscode.CommentThread;
  let gitlabService: GitLabNewService;

  const twoNotes = [
    {
      ...(noteOnDiff as GqlTextDiffNote),
      id: 'gid://gitlab/DiffNote/1',
      body: 'first body',
    },
    {
      ...(noteOnDiff as GqlTextDiffNote),
      id: 'gid://gitlab/DiffNote/2',
      body: 'second body',
    },
  ];

  const createGqlTextDiffDiscussion: (...notes: GqlTextDiffNote[]) => GqlTextDiffDiscussion = (
    ...notes
  ) => {
    return {
      ...discussionOnDiff,
      notes: {
        ...discussionOnDiff.notes,
        nodes: notes,
      },
    };
  };

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
          dispose: jest.fn(),
        };
        return vsCommentThread;
      },
    };
    gitlabService = ({
      setResolved: jest.fn(),
      deleteNote: jest.fn(),
      updateNoteBody: jest.fn(),
    } as unknown) as GitLabNewService;
    gitlabCommentThread = GitLabCommentThread.createThread({
      commentController: fakeCommentController,
      workspaceFolder: '/workspaceFolder',
      mr,
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

  it('takes position from the first note', () => {
    expect(vsCommentThread.range.start.line).toBe(noteOnDiff.position.oldLine - 1); // vs code numbers lines from 0
  });

  it('generates uri for the discussion', () => {
    // TODO: improve the uri tests once we merge https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/192
    const { baseSha } = noteOnDiff.position.diffRefs; // baseSha points to the commit that the MR started from (old lines)
    expect(vsCommentThread.uri.query).toMatch(baseSha);
  });

  describe('allowing replies to the thread', () => {
    const createNoteAndSetCreatePermissions = (createNote: boolean): GqlTextDiffNote => ({
      ...(noteOnDiff as GqlTextDiffNote),
      userPermissions: {
        ...noteOnDiff.userPermissions,
        createNote,
      },
    });

    it('disallows replies if the first note has createNote permissions', () => {
      const note = createNoteAndSetCreatePermissions(true);

      createGitLabCommentThread(createGqlTextDiffDiscussion(note));

      // TODO: allow replies when finishing #339
      expect(vsCommentThread.canReply).toBe(false);
    });

    it('disallows replies if the first note does not have createNote permissions', () => {
      const note = createNoteAndSetCreatePermissions(false);

      createGitLabCommentThread(createGqlTextDiffDiscussion(note));

      expect(vsCommentThread.canReply).toBe(false);
    });
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

      await expect(gitlabCommentThread.toggleResolved()).rejects.toBe(error);

      expect(vsCommentThread.contextValue).toBe('unresolved');
    });

    it("doesn't populate the context if user doesn't have permission to resolve the note", () => {
      const discussionWithoutPermission = createGqlTextDiffDiscussion({
        ...(noteOnDiff as GqlTextDiffNote),
        userPermissions: {
          ...noteOnDiff.userPermissions,
          resolveNote: false,
        },
      });

      createGitLabCommentThread(discussionWithoutPermission);

      expect(vsCommentThread.contextValue).toBe(undefined);
    });
  });

  it('creates GitLabComments', () => {
    expect(vsCommentThread.comments.length).toBe(1);
    const [comment] = vsCommentThread.comments;
    expect(comment).toBeInstanceOf(GitLabComment);
    expect(comment.body).toBe(noteOnDiff.body);
  });

  describe('deleting comments', () => {
    it('deletes a comment', async () => {
      createGitLabCommentThread(createGqlTextDiffDiscussion(...twoNotes));
      (gitlabService.deleteNote as jest.Mock).mockResolvedValue(undefined);

      await gitlabCommentThread.deleteComment(vsCommentThread.comments[0] as GitLabComment);

      expect(gitlabService.deleteNote).toHaveBeenCalledWith('gid://gitlab/DiffNote/1');
      expect(vsCommentThread.dispose).not.toHaveBeenCalled();
      expect(vsCommentThread.comments.length).toBe(1);
      expect((vsCommentThread.comments[0] as GitLabComment).id).toBe('gid://gitlab/DiffNote/2');
    });

    it('disposes the thread if we delete the last comment', async () => {
      (gitlabService.deleteNote as jest.Mock).mockResolvedValue(undefined);

      await gitlabCommentThread.deleteComment(vsCommentThread.comments[0] as GitLabComment);

      expect(vsCommentThread.dispose).toHaveBeenCalled();
      expect(vsCommentThread.comments.length).toBe(0);
    });

    it("doesn't delete the comment if the API call failed", async () => {
      const error = new Error();
      (gitlabService.deleteNote as jest.Mock).mockRejectedValue(error);

      await expect(
        gitlabCommentThread.deleteComment(vsCommentThread.comments[0] as GitLabComment),
      ).rejects.toBe(error);

      expect(vsCommentThread.comments.length).toBe(1);
    });
  });

  describe('editing comments', () => {
    beforeEach(() => {
      createGitLabCommentThread(createGqlTextDiffDiscussion(...twoNotes));
    });

    it('starts editing comment', () => {
      gitlabCommentThread.startEdit(vsCommentThread.comments[0] as GitLabComment);

      expect(vsCommentThread.comments[0].mode).toBe(vscode.CommentMode.Editing);
      expect(vsCommentThread.comments[1].mode).toBe(vscode.CommentMode.Preview);
    });

    it('replaces the original comments array when editing a comment', () => {
      const originalCommentArray = vsCommentThread.comments;

      gitlabCommentThread.startEdit(vsCommentThread.comments[0] as GitLabComment);

      // this is important because the real vscode.CommentThread implementation listens
      // on `set comments()` and updates the visual representation when the array reference changes
      expect(vsCommentThread.comments).not.toBe(originalCommentArray);
    });

    it('stops editing the comment and resets the comment body', () => {
      gitlabCommentThread.startEdit(vsCommentThread.comments[0] as GitLabComment);
      vsCommentThread.comments[0].body = 'new body'; // vs code updates the edited text in place

      gitlabCommentThread.cancelEdit(vsCommentThread.comments[0] as GitLabComment);

      expect(vsCommentThread.comments[0].mode).toBe(vscode.CommentMode.Preview);
      expect(vsCommentThread.comments[0].body).toBe('first body');
      expect(vsCommentThread.comments[1].mode).toBe(vscode.CommentMode.Preview);
    });
  });

  describe('updating comments', () => {
    beforeEach(() => {
      createGitLabCommentThread(createGqlTextDiffDiscussion(...twoNotes));
      gitlabCommentThread.startEdit(vsCommentThread.comments[0] as GitLabComment);
      vsCommentThread.comments[0].body = 'updated body';
    });

    it('submits updated comment', async () => {
      (gitlabService.updateNoteBody as jest.Mock).mockResolvedValue(undefined);

      await gitlabCommentThread.submitEdit(vsCommentThread.comments[0] as GitLabComment);

      expect(vsCommentThread.comments[0].mode).toBe(vscode.CommentMode.Preview);
      expect(vsCommentThread.comments[0].body).toBe('updated body');
      expect((vsCommentThread.comments[0] as GitLabComment).gqlNote.body).toBe('updated body');
    });

    it("doesn't update the underlying GraphQL note body if API update fails", async () => {
      const error = new Error();

      (gitlabService.updateNoteBody as jest.Mock).mockRejectedValue(error);

      await expect(
        gitlabCommentThread.submitEdit(vsCommentThread.comments[0] as GitLabComment),
      ).rejects.toBe(error);

      expect(vsCommentThread.comments[0].mode).toBe(vscode.CommentMode.Editing);
      expect(vsCommentThread.comments[0].body).toBe('updated body');
      expect((vsCommentThread.comments[0] as GitLabComment).gqlNote.body).toBe('first body');
    });
  });
});
