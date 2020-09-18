const temp = require('temp');
const simpleGit = require('simple-git');
const GitService = require('./git_service');

describe('git_service', () => {
  const ORIGIN = 'origin';
  const SECOND_REMOTE = 'second'; // name is important, we need this remote to be alphabetically behind origin

  let gitService;
  let workspaceFolder;
  let git;

  temp.track(); // clean temporary folders after the tests finish

  const createTempFolder = () =>
    new Promise((resolve, reject) => {
      temp.mkdir('vscodeWorkplace', (err, dirPath) => {
        if (err) reject(err);
        resolve(dirPath);
      });
    });

  describe('with initialized git repository', () => {
    beforeEach(async () => {
      workspaceFolder = await createTempFolder();
      git = simpleGit(workspaceFolder, { binary: 'git' });
      await git.init();
      await git.addConfig('user.email', 'test@example.com');
      await git.addConfig('user.name', 'Test Name');
      await git.addRemote(ORIGIN, 'git@test.gitlab.com:gitlab-org/gitlab.git');

      gitService = new GitService(workspaceFolder, 'https://gitlab.com');
    });

    describe('fetchGitRemote', () => {
      it('gets the remote url for first origin', async () => {
        const remoteUrl = await gitService.fetchGitRemote();
        expect(remoteUrl).toEqual({
          host: 'test.gitlab.com',
          namespace: 'gitlab-org',
          project: 'gitlab',
          schema: 'ssh:',
        });
      });

      it('gets the remote url for user configured remote name', async () => {
        await git.addRemote(SECOND_REMOTE, 'git@test.another.com:gitlab-org/gitlab.git');
        gitService = new GitService(workspaceFolder, 'https://gitlab.com', SECOND_REMOTE);

        const remoteUrl = await gitService.fetchGitRemote();

        expect(remoteUrl.host).toEqual('test.another.com');
      });

      it('gets default remote for a branch', async () => {
        await git.addRemote(SECOND_REMOTE, 'git@test.another.com:gitlab-org/gitlab.git');
        await git.checkout(['-b', 'new-branch']);
        await git.addConfig('branch.new-branch.remote', SECOND_REMOTE); // this is equivalent to setting a remote tracking branch

        const remoteUrl = await gitService.fetchGitRemote();

        expect(remoteUrl.host).toEqual('test.another.com');
      });
    });

    describe('fetchBranchName', () => {
      it('gets the current branch name', async () => {
        await git.checkout(['-b', 'new-branch']);
        // TODO if we use git branch command, we don't have to create a commit
        await git.commit({ '--allow-empty': null, '-m': 'Test commit' });

        const branchName = await gitService.fetchBranchName();

        expect(branchName).toEqual('new-branch');
      });
    });

    describe('fetchLastCommitId', () => {
      it('returns the last commit sha', async () => {
        await git.commit({ '--allow-empty': null, '-m': 'Test commit' });
        const lastCommitSha = await git.revparse('HEAD');

        const result = await gitService.fetchLastCommitId();

        expect(result).toEqual(lastCommitSha);
      });
    });

    describe('fetchGitRemotePipeline', () => {
      it('returns default remote when the pipelineGitRemoteName setting is missing', async () => {
        await git.addRemote(SECOND_REMOTE, 'git@test.another.com:gitlab-org/gitlab.git');
        const remoteUrl = await gitService.fetchGitRemotePipeline();

        expect(remoteUrl.host).toEqual('test.gitlab.com');
      });

      it('returns url for the configured pipelineGitRemoteName remote', async () => {
        await git.addRemote(SECOND_REMOTE, 'git@test.another.com:gitlab-org/gitlab.git');
        gitService = new GitService(
          workspaceFolder,
          'https://gitlab.com',
          undefined,
          SECOND_REMOTE,
        );

        const remoteUrl = await gitService.fetchGitRemotePipeline();

        expect(remoteUrl.host).toEqual('test.another.com');
      });
    });

    describe('fetchTrackingBranchName', () => {
      beforeEach(async () => {
        await git.checkout(['-b', 'new-branch']);
        // TODO if we use git branch command, we don't have to create a commit
        await git.commit({ '--allow-empty': null, '-m': 'Test commit' });
      });

      it('returns local branch name if tracking branch is not defined', async () => {
        const result = await gitService.fetchTrackingBranchName();

        expect(result).toEqual('new-branch');
      });

      it('returns tracking branch if it is configured', async () => {
        await git.addConfig('branch.new-branch.merge', `${ORIGIN}/test-branch`);

        const result = await gitService.fetchTrackingBranchName();

        expect(result).toEqual(`${ORIGIN}/test-branch`);
      });
    });
  });

  describe('without initialized git repository', () => {
    beforeEach(async () => {
      workspaceFolder = await createTempFolder();
      const tokenService = { getInstanceUrls: () => [] };
      gitService = new GitService(workspaceFolder, undefined, undefined, undefined, tokenService);
    });

    it('fetchGitRemote returns null', async () => {
      expect(await gitService.fetchGitRemote()).toEqual(null);
    });

    it('fetchBranchName returns null', async () => {
      expect(await gitService.fetchBranchName()).toEqual(null);
    });

    it('fetchLastCommitId returns null', async () => {
      expect(await gitService.fetchLastCommitId()).toEqual(null);
    });

    it('fetchGitRemotePipeline returns null', async () => {
      expect(await gitService.fetchGitRemotePipeline()).toEqual(null);
    });

    it('fetchTrackingBranchName returns null', async () => {
      expect(await gitService.fetchTrackingBranchName()).toEqual(null);
    });
  });
});
