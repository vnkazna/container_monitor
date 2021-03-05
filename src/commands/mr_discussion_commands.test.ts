import * as vscode from 'vscode';
import { GitLabComment } from '../review/gitlab_comment';
import { deleteComment } from './mr_discussion_commands';

describe('MR discussion commands', () => {
  describe('deleteComment', () => {
    let mockedComment: GitLabComment;

    beforeEach(() => {
      mockedComment = ({
        thread: {
          deleteComment: jest.fn(),
        },
      } as unknown) as GitLabComment;
    });

    afterEach(() => {
      (vscode.window.showWarningMessage as jest.Mock).mockReset();
    });

    it('calls deleteComment on the thread if the user confirms deletion', async () => {
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Delete'); // user clicked Delete

      await deleteComment(mockedComment);

      expect(mockedComment.thread.deleteComment).toHaveBeenCalledWith(mockedComment);
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'Delete comment?',
        { modal: true },
        'Delete',
      );
    });

    it("doesn't call deleteComment on the thread if the user cancels deletion", async () => {
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined); // user clicked cancel

      await deleteComment(mockedComment);

      expect(mockedComment.thread.deleteComment).not.toHaveBeenCalled();
    });
  });
});
