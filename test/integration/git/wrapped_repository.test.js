const assert = require('assert');
const simpleGit = require('simple-git');
const { getRepositoryRoot, updateRepositoryStatus } = require('../test_infrastructure/helpers');
const { gitExtensionWrapper } = require('../../../src/git/git_extension_wrapper');

describe('WrappedRepository', async () => {
  const git = simpleGit(getRepositoryRoot());

  describe('getTrackingBranchName', () => {
    beforeEach(async () => {
      await git.checkoutLocalBranch('new-branch');
      // TODO if we use git branch command, we don't have to create a commit
      await git.commit('Test commit', [], { '--allow-empty': null });
    });

    afterEach(async () => {
      await git.checkout('master');
      await git.deleteLocalBranch('new-branch', true);
      await git.raw('config', '--unset', 'branch.new-branch.merge');
    });

    it('returns local branch name if tracking branch is not defined', async () => {
      await updateRepositoryStatus();
      const result = await gitExtensionWrapper
        .getRepository(getRepositoryRoot())
        .getTrackingBranchName();

      assert.strictEqual(result, 'new-branch');
    });

    it('returns tracking branch if it is configured', async () => {
      await git.addConfig('branch.new-branch.merge', `refs/heads/test-branch`);

      await updateRepositoryStatus();
      const result = await gitExtensionWrapper
        .getRepository(getRepositoryRoot())
        .getTrackingBranchName();

      assert.strictEqual(result, 'test-branch');
    });
  });
});
