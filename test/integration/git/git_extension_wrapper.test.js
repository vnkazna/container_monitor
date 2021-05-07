const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const { gitExtensionWrapper } = require('../../../src/git/git_extension_wrapper');
const {
  createAndOpenFile,
  closeAndDeleteFile,
  simulateQuickPickChoice,
  getRepositoryRoot,
} = require('../test_infrastructure/helpers');

describe('git_extension_wrapper', () => {
  describe('getting repositories', () => {
    const sandbox = sinon.createSandbox();

    describe('one repository, no open files', () => {
      it('getActiveRepository returns the open repository', () => {
        const result = gitExtensionWrapper.getActiveRepository();
        assert.strictEqual(result.rootFsPath, getRepositoryRoot());
      });

      it('getActiveRepositoryOrSelectOne returns the open repository', async () => {
        const result = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
        assert.strictEqual(result.rootFsPath, getRepositoryRoot());
      });
    });

    describe('multiple repositories', () => {
      const fakeRepository = {
        name: 'repository 2',
        rootFsPath: '/r2',
      };

      beforeEach(() => {
        const originalRepositories = gitExtensionWrapper.repositories;
        sandbox
          .stub(gitExtensionWrapper, 'repositories')
          .get(() => [...originalRepositories, fakeRepository]);
      });

      afterEach(() => {
        sandbox.restore();
      });

      it('getActiveRepository returns undefined', () => {
        const result = gitExtensionWrapper.getActiveRepository();
        assert.strictEqual(result, undefined);
      });

      it('getActiveRepositoryOrSelectOne lets user select a repository', async () => {
        // simulating user selecting second option
        simulateQuickPickChoice(sandbox, 1);
        const result = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
        assert.strictEqual(result.rootFsPath, '/r2');
      });

      describe('with open editor', () => {
        let testFileUri;
        beforeEach(async () => {
          testFileUri = vscode.Uri.parse(`${getRepositoryRoot()}/newfile.js`);
          await createAndOpenFile(testFileUri);
        });

        afterEach(async () => {
          await closeAndDeleteFile(testFileUri);
        });

        it('getActiveRepository returns repository for the open file', () => {
          const result = gitExtensionWrapper.getActiveRepository();
          assert.strictEqual(result.rootFsPath, getRepositoryRoot());
        });

        it('getActiveRepositoryOrSelectOne returns repository for the open file', async () => {
          const result = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
          assert.strictEqual(result.rootFsPath, getRepositoryRoot());
        });
      });
    });
  });
});
