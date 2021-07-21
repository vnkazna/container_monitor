import * as vscode from 'vscode';
import * as gitLabService from './gitlab_service';
import { pipeline, mr, issue, job } from './test_utils/entities';
import { USER_COMMANDS } from './command_names';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { asMock } from './test_utils/as_mock';

jest.mock('./gitlab_service');
jest.mock('./git/git_extension_wrapper');

asMock(vscode.workspace.getConfiguration).mockReturnValue({
  showStatusBarLinks: true,
  showIssueLinkOnStatusBar: true,
  showMrStatusOnStatusBar: true,
});

// StatusBar needs to be imported after we mock the configuration because it uses the configuration
// during module initialization
// eslint-disable-next-line import/first
import { StatusBar } from './status_bar';

const createFakeItem = (): vscode.StatusBarItem =>
  (({
    show: jest.fn(),
    hide: jest.fn(),
    dispose: jest.fn(),
  } as unknown) as vscode.StatusBarItem);

// StatusBar is only interested in whether the project exists or not
const mockedGitLabProject = {};

describe('status_bar', () => {
  let fakeItems: vscode.StatusBarItem[];
  let statusBar: StatusBar;
  const getPipelineItem = () => fakeItems[0];
  const getMrItem = () => fakeItems[1];
  const getClosingIssueItem = () => fakeItems[2];

  beforeEach(() => {
    fakeItems = [];
    statusBar = new StatusBar();
    asMock(vscode.window.createStatusBarItem).mockImplementation(() => {
      const fakeItem = createFakeItem();
      fakeItems.push(fakeItem);
      return fakeItem;
    });
    asMock(gitExtensionWrapper.getActiveRepository).mockReturnValue({
      rootFsPath: '/folder',
      getProject: async () => ({}),
    });
  });

  afterEach(() => {
    statusBar.dispose();
  });

  it('hides all items when the workspace does not contain GitLab project', async () => {
    asMock(gitExtensionWrapper.getActiveRepository).mockReturnValue({
      rootFsPath: '/folder',
      getProject: async () => undefined,
    });
    await statusBar.init();
    expect(getPipelineItem().hide).toHaveBeenCalled();
    expect(getMrItem().hide).toHaveBeenCalled();
    expect(getClosingIssueItem().hide).toHaveBeenCalled();
  });

  describe('pipeline item', () => {
    beforeEach(() => {
      asMock(gitLabService.fetchLastJobsForCurrentBranch).mockReset();
    });

    it('initializes the pipeline item with success', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({ pipeline });
      await statusBar.init();
      expect(getPipelineItem().show).toHaveBeenCalled();
      expect(getPipelineItem().hide).not.toHaveBeenCalled();
      expect(getPipelineItem().text).toBe('$(check) GitLab: Pipeline passed');
    });

    it('prints jobs for running pipeline', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({
        pipeline: {
          ...pipeline,
          status: 'running',
        },
      });
      asMock(gitLabService.fetchLastJobsForCurrentBranch).mockReturnValue([
        {
          ...job,
          status: 'running',
          name: 'Unit Tests',
        },
        {
          ...job,
          status: 'running',
          name: 'Integration Tests',
        },
        {
          ...job,
          status: 'success',
          name: 'Lint',
        },
      ]);
      await statusBar.init();
      expect(getPipelineItem().text).toBe(
        '$(pulse) GitLab: Pipeline running (Unit Tests, Integration Tests)',
      );
    });

    it('sorts by created time (starts with newer) and deduplicates jobs for running pipeline', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({
        pipeline: {
          ...pipeline,
          status: 'running',
        },
      });
      asMock(gitLabService.fetchLastJobsForCurrentBranch).mockReturnValue([
        {
          ...job,
          status: 'running',
          name: 'Integration Tests',
          created_at: '2021-07-19T12:00:00.000Z',
        },
        {
          ...job,
          status: 'running',
          name: 'Unit Tests',
          created_at: '2021-07-19T10:00:00.000Z',
        },
        {
          ...job,
          status: 'running',
          name: 'Unit Tests',
          created_at: '2021-07-19T11:00:00.000Z',
        },
      ]);
      await statusBar.init();
      expect(getPipelineItem().text).toBe(
        '$(pulse) GitLab: Pipeline running (Unit Tests, Integration Tests)',
      );
    });

    it('shows no pipeline text when there is no pipeline', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({
        pipeline: null,
      });
      await statusBar.init();
      expect(getPipelineItem().text).toBe('GitLab: No pipeline.');
    });

    it.each`
      status        | itemText
      ${'running'}  | ${'$(pulse) GitLab: Pipeline running'}
      ${'success'}  | ${'$(check) GitLab: Pipeline passed'}
      ${'pending'}  | ${'$(clock) GitLab: Pipeline pending'}
      ${'failed'}   | ${'$(x) GitLab: Pipeline failed'}
      ${'canceled'} | ${'$(circle-slash) GitLab: Pipeline canceled'}
      ${'skipped'}  | ${'$(diff-renamed) GitLab: Pipeline skipped'}
    `('shows $itemText for pipeline with status $status', async ({ status, itemText }) => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({
        pipeline: {
          ...pipeline,
          status,
        },
      });
      await statusBar.init();
      expect(getPipelineItem().text).toBe(itemText);
    });
  });

  describe('MR item', () => {
    beforeEach(() => {
      asMock(gitLabService.fetchCurrentPipelineProject).mockReturnValue(mockedGitLabProject);
      // FIXME: why is closing issue fetched from normal remote and pipeline result from pipeline remote?
      asMock(gitExtensionWrapper.getActiveRepository).mockReturnValue({
        rootFsPath: '/folder',
        getProject: async () => mockedGitLabProject,
      });
    });

    it('shows MR item', async () => {
      asMock(gitLabService.fetchMRIssues).mockReturnValue([]);
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({ mr });
      await statusBar.init();
      expect(getMrItem().show).toHaveBeenCalled();
      expect(getMrItem().hide).not.toHaveBeenCalled();
      expect(getMrItem().text).toBe('$(git-pull-request) GitLab: MR !2000');
      const command = getMrItem().command as vscode.Command;
      expect(command.command).toBe('vscode.open');
      expect(command.arguments?.[0]).toEqual(vscode.Uri.parse(mr.web_url));
    });

    it('shows create MR text when there is no MR', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({});
      await statusBar.init();
      expect(getMrItem().text).toBe('$(git-pull-request) GitLab: Create MR.');
      expect(getMrItem().command).toBe(USER_COMMANDS.OPEN_CREATE_NEW_MR);
    });
  });

  describe('MR closing issue item', () => {
    beforeEach(() => {
      asMock(gitLabService.fetchCurrentPipelineProject).mockReturnValue(mockedGitLabProject);
      // FIXME: why is closing issue fetched from normal remote and pipeline result from pipeline remote?
      asMock(gitExtensionWrapper.getActiveRepository).mockReturnValue({
        rootFsPath: '/folder',
        getProject: async () => mockedGitLabProject,
      });
    });

    it('shows closing issue for an MR', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({ mr });
      asMock(gitLabService.fetchMRIssues).mockReturnValue([issue]);
      await statusBar.init();
      expect(getClosingIssueItem().show).toHaveBeenCalled();
      expect(getClosingIssueItem().hide).not.toHaveBeenCalled();
      expect(getClosingIssueItem().text).toBe('$(code) GitLab: Issue #1000');
      const command = getClosingIssueItem().command as vscode.Command;
      expect(command.command).toBe('vscode.open');
      expect(command.arguments?.[0]).toEqual(vscode.Uri.parse(issue.web_url));
    });

    it('shows no issue when there is not a closing issue', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({ mr });
      asMock(gitLabService.fetchMRIssues).mockReturnValue([]);
      await statusBar.init();
      expect(getClosingIssueItem().text).toBe('$(code) GitLab: No issue.');
      expect(getClosingIssueItem().command).toBe(undefined);
    });

    it('hides the item when there is is no MR', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({});
      await statusBar.init();
      expect(getClosingIssueItem().hide).toHaveBeenCalled();
    });
  });
});
