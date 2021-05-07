import * as temp from 'temp';
import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { GitService, GitServiceOptions } from './git_service';
import { gitExtensionWrapper } from './git/git_extension_wrapper';

const isMac = () => Boolean(process.platform.match(/darwin/));

describe('git_service', () => {
  const ORIGIN = 'origin';
  const SECOND_REMOTE = 'second'; // name is important, we need this remote to be alphabetically behind origin

  let gitService: GitService;
  let repositoryRoot: string;
  let git: SimpleGit;

  temp.track(); // clean temporary folders after the tests finish

  const createTempFolder = (): Promise<string> =>
    new Promise((resolve, reject) => {
      temp.mkdir('vscodeWorkplace', (err, dirPath) => {
        if (err) reject(err);
        // on mac, the temp node module creates folder in /var. /var is a symlink
        // to /private/var on mac. Every time we use git, it returns the non-symlinked /private prefixed path
        // https://apple.stackexchange.com/questions/1043/why-is-tmp-a-symlink-to-private-tmp/1096
        // this prefixing brings the git results in sync with the rest of the tests
        const result = isMac() ? `/private${dirPath}` : dirPath;
        resolve(result);
      });
    });

  const getDefaultOptions = (): GitServiceOptions => ({
    repositoryRoot,
    preferredRemoteName: undefined,
  });

  beforeEach(() => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      instanceUrl: 'https://gitlab.com',
    });
    jest.spyOn(gitExtensionWrapper, 'gitBinaryPath', 'get').mockReturnValue('git');
  });

  afterEach(() => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReset();
  });

  describe('with initialized git repository', () => {
    beforeEach(async () => {
      repositoryRoot = await createTempFolder();
      git = simpleGit(repositoryRoot, { binary: 'git' });
      await git.init();
      await git.addConfig('user.email', 'test@example.com');
      await git.addConfig('user.name', 'Test Name');
      await git.addRemote(ORIGIN, 'git@test.gitlab.com:gitlab-org/gitlab.git');

      gitService = new GitService(getDefaultOptions());
    });

    describe('fetchGitRemote', () => {
      it('gets the remote url for first origin', async () => {
        const remoteUrl = await gitService.fetchGitRemote();
        expect(remoteUrl).toEqual({
          host: 'test.gitlab.com',
          namespace: 'gitlab-org',
          project: 'gitlab',
        });
      });

      it('gets the remote url for user configured remote name', async () => {
        await git.addRemote(SECOND_REMOTE, 'git@test.another.com:gitlab-org/gitlab.git');
        const options = { ...getDefaultOptions(), preferredRemoteName: SECOND_REMOTE };
        gitService = new GitService(options);

        const remoteUrl = await gitService.fetchGitRemote();

        expect(remoteUrl?.host).toEqual('test.another.com');
      });

      it('gets default remote for a branch', async () => {
        await git.addRemote(SECOND_REMOTE, 'git@test.another.com:gitlab-org/gitlab.git');
        await git.checkout(['-b', 'new-branch']);
        await git.addConfig('branch.new-branch.remote', SECOND_REMOTE); // this is equivalent to setting a remote tracking branch

        const remoteUrl = await gitService.fetchGitRemote();

        expect(remoteUrl?.host).toEqual('test.another.com');
      });
    });

    describe('fetchLastCommitId', () => {
      it('returns the last commit sha', async () => {
        await git.commit('Test commit', [], { '--allow-empty': null });
        const lastCommitSha = await git.revparse(['HEAD']);

        const result = await gitService.fetchLastCommitId();

        expect(result).toEqual(lastCommitSha);
      });
    });

    describe('fetchTrackingBranchName', () => {
      beforeEach(async () => {
        await git.checkout(['-b', 'new-branch']);
        // TODO if we use git branch command, we don't have to create a commit
        await git.commit('Test commit', [], { '--allow-empty': null });
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

    describe('getFileContent', () => {
      it('returns null when the file does not exist', async () => {
        await git.commit('Test commit', [], { '--allow-empty': null });
        const lastCommitSha = await git.revparse(['HEAD']);
        const result = await gitService.getFileContent('/non/exising/file', lastCommitSha);
        expect(result).toEqual(null);
      });

      it('returns file content on the given sha', async () => {
        await fs.writeFile(`${repositoryRoot}/test.txt`, 'Test text');
        await git.add('.');
        await git.commit('Test commit');
        const lastCommitSha = await git.revparse(['HEAD']);
        const result = await gitService.getFileContent('/test.txt', lastCommitSha);
        expect(result).toEqual('Test text');
      });
    });

    describe('getRepositoryRootFolder', () => {
      it('returns the repositoryRoot if it is the git root', async () => {
        gitService = new GitService({ ...getDefaultOptions(), repositoryRoot });

        const result = await gitService.getRepositoryRootFolder();

        expect(result).toBe(repositoryRoot);
      });

      it('returns the parent folder if the git service is created for git subfolder', async () => {
        const subfolder = path.join(repositoryRoot, 'subfolder');
        await fs.mkdir(subfolder);
        gitService = new GitService({ ...getDefaultOptions(), repositoryRoot: subfolder });

        const result = await gitService.getRepositoryRootFolder();

        expect(result).toBe(repositoryRoot);
      });
    });
  });

  describe('without initialized git repository', () => {
    beforeEach(async () => {
      repositoryRoot = await createTempFolder();
      const options = { ...getDefaultOptions(), instanceUrl: undefined };
      gitService = new GitService(options);
    });

    it('fetchGitRemote returns throws', async () => {
      expect(gitService.fetchGitRemote()).rejects.toBeInstanceOf(Error);
    });

    it('fetchLastCommitId returns null', async () => {
      expect(gitService.fetchLastCommitId()).rejects.toBeInstanceOf(Error);
    });

    it('fetchTrackingBranchName returns null', async () => {
      expect(gitService.fetchTrackingBranchName()).rejects.toBeInstanceOf(Error);
    });

    it('getRepositoryRootFolder throws', async () => {
      expect(gitService.getRepositoryRootFolder()).rejects.toBeInstanceOf(Error);
    });
  });
});
