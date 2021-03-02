import * as vscode from 'vscode';
import { GitLabCommentThread } from './gitlab_comment_thread';
import { noteOnDiff } from '../../test/integration/fixtures/graphql/discussions.js';
import { GitLabComment } from './gitlab_comment';
import { GqlTextDiffNote } from '../gitlab/gitlab_new_service';

describe('GitLabCommentThread', () => {
  let gitlabCommentThread: GitLabCommentThread;
  let vsCommentThread: vscode.CommentThread;

  beforeEach(() => {
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
    gitlabCommentThread = GitLabCommentThread.createThread(
      fakeCommentController,
      '/workspaceFolder',
      12345,
      [noteOnDiff as GqlTextDiffNote],
    );
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

  it('creates GitLabComments', () => {
    expect(vsCommentThread.comments.length).toBe(1);
    const [comment] = vsCommentThread.comments;
    expect(comment).toBeInstanceOf(GitLabComment);
    expect((comment as GitLabComment).body).toBe(noteOnDiff.body);
  });
});
