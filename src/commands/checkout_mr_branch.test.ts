import * as vscode from 'vscode';
import { MrItemModel } from '../tree_view/items/mr_item_model';
import { checkoutMrBranch } from './checkout_mr_branch';
import { WrappedRepository } from '../git/wrapped_repository';
import { mr } from '../test_utils/entities';
import { GitErrorCodes } from '../api/git';

describe('checkout MR branch', () => {
  let mrItemModel: MrItemModel;

  let wrappedRepository: WrappedRepository;

  beforeEach(() => {
    const mockRepository: Partial<WrappedRepository> = {
      fetch: jest.fn().mockResolvedValue(undefined),
      checkout: jest.fn().mockResolvedValue(undefined),
      lastCommitSha: mr.sha,
    };
    wrappedRepository = mockRepository as WrappedRepository;
    (vscode.window.withProgress as jest.Mock).mockImplementation((_, task) => task());
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('with branch from the same project', () => {
    beforeEach(() => {
      const mrFromTheSameProject = {
        ...mr,
        source_project_id: 123,
        target_project_id: 123,
        source_branch_name: 'feature-a',
      };
      mrItemModel = new MrItemModel(mrFromTheSameProject, wrappedRepository);
    });

    it('checks out the local branch', async () => {
      await checkoutMrBranch(mrItemModel);

      expect(wrappedRepository.fetch).toBeCalled();
      expect(wrappedRepository.checkout).toBeCalledWith('feature-a');
    });

    it('shows a success message', async () => {
      await checkoutMrBranch(mrItemModel);

      expect(vscode.window.showInformationMessage).toBeCalledWith('Branch changed to feature-a');
    });

    it('rejects with an error if error occurred', async () => {
      (wrappedRepository.checkout as jest.Mock).mockRejectedValue(new Error('error'));

      await expect(checkoutMrBranch(mrItemModel)).rejects.toEqual(new Error('error'));
    });

    it('handles errors from the Git Extension', async () => {
      (wrappedRepository.checkout as jest.Mock).mockRejectedValue({
        gitErrorCode: GitErrorCodes.DirtyWorkTree,
        stderr: 'Git standard output',
      });

      await checkoutMrBranch(mrItemModel);

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Checkout failed: Git standard output',
        'See Git Log',
      );
    });

    it('warns user that their local branch is not in sync', async () => {
      (wrappedRepository as any).lastCommitSha = 'abdef'; // simulate local sha being different from mr.sha

      await checkoutMrBranch(mrItemModel);

      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        "Branch changed to feature-a, but it's out of sync with the remote branch. Synchronize it by pushing or pulling.",
      );
    });
  });

  describe('with branch from a forked project', () => {
    beforeEach(() => {
      const mrFromAFork = {
        ...mr,
        source_project_id: 123,
        target_project_id: 456,
        source_branch_name: 'feature-a',
      };
      mrItemModel = new MrItemModel(mrFromAFork, wrappedRepository);
    });
    it('throws an error', async () => {
      await expect(checkoutMrBranch(mrItemModel)).rejects.toMatchObject({
        message: 'this command is only available for same-project MRs',
      });
    });
  });
});
