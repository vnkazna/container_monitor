import * as vscode from 'vscode';
import { GitLabCommentThread } from './gitlab_comment_thread';
import {
  discussionOnDiff,
  noteOnDiff,
} from '../../test/integration/fixtures/graphql/discussions.js';
import { GitLabComment } from './gitlab_comment';
import { GqlTextDiffDiscussion } from '../gitlab/gitlab_new_service';

describe('GitLabCommentThread', () => {
  let gitlabCommentThread: GitLabCommentThread;
  let vsCommentThread: vscode.CommentThread;

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
    gitlabCommentThread = GitLabCommentThread.createThread({
      commentController: fakeCommentController,
      workspaceFolder: '/workspaceFolder',
      gitlabProjectId: 12345,
      discussion,
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

  it('sets context to unresolved', () => {
    expect(vsCommentThread.contextValue).toBe('unresolved');
  });

  it('sets context to resolved', () => {
    createGitLabCommentThread({ ...(discussionOnDiff as GqlTextDiffDiscussion), resolved: true });
    expect(vsCommentThread.contextValue).toBe('resolved');
  });

  it('creates GitLabComments', () => {
    expect(vsCommentThread.comments.length).toBe(1);
    const [comment] = vsCommentThread.comments;
    expect(comment).toBeInstanceOf(GitLabComment);
    expect((comment as GitLabComment).body).toBe(noteOnDiff.body);
  });
});
