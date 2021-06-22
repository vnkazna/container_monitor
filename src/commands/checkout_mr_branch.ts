import * as vscode from 'vscode';
import * as assert from 'assert';
import * as sidebar from '../sidebar.js';
import { MrItemModel } from '../data_providers/items/mr_item_model';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { UserFriendlyError } from '../errors/user_friendly_error';
import { handleError } from '../log';

/**
 * Command will checkout source branch by merge request in current git. Merge request must be from local branch.
 * @param data item of view from the left sidebar
 */
export const checkoutMrBranch = async (data: MrItemModel): Promise<void> => {
  // todo: Change data.workspace to data.repository (issue #345)
  assert(data.mr.target_project_id === data.mr.source_project_id);
  const { showInformationMessage } = vscode.window;
  const sourceBranchName = data.mr.source_branch as string;
  let branchNameForCheckout: string;
  try {
    const repos = gitExtensionWrapper.getRepositoriesByWorkspace(data.workspace);
    if (repos.length > 1) {
      throw new Error(
        `You have more then one repos in one workspace. Extension can't work with this case yet. But we will fix it on soon.`,
      );
    }
    const repo = repos[0];
    showInformationMessage('Fetching branches...');

    // merge from local branch
    branchNameForCheckout = sourceBranchName;
    await repo.fetch();
    await repo.checkout(sourceBranchName);

    assert(
      repo.state.HEAD,
      "We can't read repository HEAD. We suspect that your `git head` command fails and we can't continue till it succeeds",
    );

    const currentBranchName = repo.state.HEAD.name;
    if (currentBranchName !== branchNameForCheckout) {
      throw new Error(
        `The branch name after the checkout (${currentBranchName}) is not the branch that the extension tried to check out (${branchNameForCheckout}). This is an unexpected error, please inspect your repository before making any further changes.`,
      );
    }

    sidebar.refresh();
    showInformationMessage(`Branch successfully changed to ${sourceBranchName}`);
  } catch (e) {
    handleError(
      new UserFriendlyError(
        e.stderr || `${(e as Error).message}` || `Couldn't checkout branch ${sourceBranchName}`,
        e,
      ),
    );
  }
};
