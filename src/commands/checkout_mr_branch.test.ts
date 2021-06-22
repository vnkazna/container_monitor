import * as vscode from 'vscode';
import * as sidebar from '../sidebar.js';
import { GitExtension, Repository } from '../api/git';
import { MrItemModel } from '../data_providers/items/mr_item_model';
import { anotherWorkspace, mr, workspace } from '../test_utils/entities';
import { createFakeRepository, FakeGitExtension } from '../test_utils/fake_git_extension';
import { checkoutMrBranch } from './checkout_mr_branch';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';

jest.mock('../sidebar.js');
vscode.window.showInformationMessage = jest.fn();
vscode.window.showErrorMessage = jest.fn();

describe('MR branch commands', () => {
  describe('Checkout branch by Merge request', () => {
    let commandData: MrItemModel;

    let fakeExtension: FakeGitExtension;

    let firstWorkspace: GitLabWorkspace;
    let secondWorkspace: GitLabWorkspace;

    let firstRepository: Repository;
    let secondRepository: Repository;

    beforeEach(() => {
      firstWorkspace = { ...workspace };
      secondWorkspace = { ...anotherWorkspace };
    });

    afterEach(() => {
      (vscode.window.showInformationMessage as jest.Mock).mockReset();
      (vscode.window.showWarningMessage as jest.Mock).mockReset();
    });

    describe('If merge request from local branch', () => {
      describe('Basic functionality', () => {
        beforeEach(() => {
          firstRepository = createFakeRepository(firstWorkspace.uri);
          secondRepository = createFakeRepository(secondWorkspace.uri);

          fakeExtension = new FakeGitExtension(firstRepository, secondRepository);
          jest
            .spyOn(gitExtensionWrapper, 'Extension', 'get')
            .mockReturnValue((fakeExtension as unknown) as GitExtension);

          commandData = new MrItemModel(mr, firstWorkspace);

          checkoutByMRFromLocalBranch(commandData);
        });

        it('(local-branch) Branch fetch message', () => {
          expect((vscode.window.showInformationMessage as jest.Mock).mock.calls[0]).toEqual([
            'Fetching branches...',
          ]);
        });

        it('(local-branch) Was checkout', async () => {
          await expect(firstRepository.checkout).toBeCalled();
        });

        it('(local-branch) Was fetching before checkout', async () => {
          await expect(firstRepository.checkout).toBeCalled();
          expect(firstRepository.fetch).toBeCalled();
        });

        it('(local-branch) There were no error messages', () => {
          expect(vscode.window.showErrorMessage).not.toBeCalled();
        });

        it('(local-branch) Sidebar was refreshed', () => {
          expect(sidebar.refresh).toBeCalled();
        });

        it('(local-branch) Message about success', () => {
          const callsCount = (vscode.window.showInformationMessage as jest.Mock).mock.calls.length;
          expect(
            (vscode.window.showInformationMessage as jest.Mock).mock.calls[callsCount - 1],
          ).toEqual([`Branch successfully changed to ${mr.source_branch}`]);
        });
      });
      describe('Multi-root Workspaces', () => {
        beforeEach(() => {
          commandData = new MrItemModel(mr, secondWorkspace);

          checkoutByMRFromLocalBranch(commandData);
        });

        it('(multi-root) The branch was checkout  from right repository', async () => {
          await expect(secondRepository.checkout).toBeCalled();
        });

        it('(multi-root) The branch from second repository was not checkout', async () => {
          await expect(secondRepository.checkout).toBeCalled();
          expect(firstRepository.fetch).not.toBeCalled();
          expect(firstRepository.checkout).not.toBeCalled();
        });
      });
    });
  });
});
