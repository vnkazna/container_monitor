const vscode = require('vscode');

jest.mock('./gitlab_service');
vscode.workspace.getConfiguration.mockReturnValue({
  showStatusBarLinks: true,
  showIssueLinkOnStatusBar: true,
  showMrStatusOnStatusBar: true,
});
const { StatusBar } = require('./status_bar');
const gitLabService = require('./gitlab_service');
const { project, pipeline, mr, issue } = require('./test_utils/entities');

const createFakeItem = () => ({
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn(),
});

describe('status_bar', () => {
  let fakeItems;
  let statusBar;
  const getPipelineItem = () => fakeItems[0];
  const getClosingIssueItem = () => fakeItems[1];
  const getMrItem = () => fakeItems[2];

  beforeEach(() => {
    fakeItems = [];
    statusBar = new StatusBar();
    vscode.window.createStatusBarItem.mockImplementation(() => {
      const fakeItem = createFakeItem();
      fakeItems.push(fakeItem);
      return fakeItem;
    });
  });
  describe('pipeline item', () => {
    beforeEach(() => {
      gitLabService.fetchCurrentPipelineProject.mockReturnValue(project);
      gitLabService.fetchLastJobsForCurrentBranch.mockReset();
    });

    afterEach(() => {
      statusBar.dispose();
    });

    it('initializes the pipeline item with success', async () => {
      gitLabService.fetchLastPipelineForCurrentBranch.mockReturnValue(pipeline);
      await statusBar.init();
      expect(getPipelineItem().show).toHaveBeenCalled();
      expect(getPipelineItem().hide).not.toHaveBeenCalled();
      expect(getPipelineItem().text).toBe('$(check) GitLab: Pipeline passed');
    });

    it('prints jobs for running pipeline', async () => {
      gitLabService.fetchLastPipelineForCurrentBranch.mockReturnValue({
        ...pipeline,
        status: 'running',
      });
      gitLabService.fetchLastJobsForCurrentBranch.mockReturnValue([
        {
          status: 'running',
          name: 'Unit Tests',
        },
        {
          status: 'running',
          name: 'Integration Tests',
        },
        {
          status: 'success',
          name: 'Lint',
        },
      ]);
      await statusBar.init();
      expect(getPipelineItem().text).toBe(
        '$(pulse) GitLab: Pipeline running (Unit Tests, Integration Tests)',
      );
    });

    it('shows no pipeline text when there is no pipeline', async () => {
      gitLabService.fetchLastPipelineForCurrentBranch.mockReturnValue(null);
      await statusBar.init();
      expect(getPipelineItem().text).toBe('GitLab: No pipeline.');
    });

    it('hides the item when there is no project', async () => {
      gitLabService.fetchCurrentPipelineProject.mockReturnValue(null);
      await statusBar.init();
      expect(getPipelineItem().hide).toHaveBeenCalled();
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
      gitLabService.fetchLastPipelineForCurrentBranch.mockReturnValue({
        ...pipeline,
        status,
      });
      await statusBar.init();
      expect(getPipelineItem().text).toBe(itemText);
    });
  });

  describe('MR closing issue item', () => {
    beforeEach(() => {
      gitLabService.fetchCurrentPipelineProject.mockReturnValue(project);
      // FIXME: why is closing issue fetched from normal remote and pipeline result from pipeline remote?
      gitLabService.fetchCurrentProject.mockReturnValue(project);
      gitLabService.fetchLastPipelineForCurrentBranch.mockReturnValue(null);
    });

    afterEach(() => {
      statusBar.dispose();
    });

    it('shows closing issue for an MR', async () => {
      gitLabService.fetchOpenMergeRequestForCurrentBranch.mockReturnValue(mr);
      gitLabService.fetchMRIssues.mockReturnValue([issue]);
      await statusBar.init();
      expect(getClosingIssueItem().show).toHaveBeenCalled();
      expect(getClosingIssueItem().hide).not.toHaveBeenCalled();
      expect(getClosingIssueItem().text).toBe('$(code) GitLab: Issue #1000');
    });

    it('shows no issue when there is not a closing issue', async () => {
      gitLabService.fetchOpenMergeRequestForCurrentBranch.mockReturnValue(mr);
      gitLabService.fetchMRIssues.mockReturnValue([]);
      await statusBar.init();
      expect(getClosingIssueItem().text).toBe('$(code) GitLab: No issue.');
    });

    it('shows no issue when there is no MR', async () => {
      gitLabService.fetchOpenMergeRequestForCurrentBranch.mockReturnValue(null);
      await statusBar.init();
      expect(getClosingIssueItem().text).toBe('$(code) GitLab: No issue.');
    });

    it('hides the item when there is no project', async () => {
      gitLabService.fetchCurrentProject.mockReturnValue(null);
      await statusBar.init();
      expect(getClosingIssueItem().hide).toHaveBeenCalled();
    });
  });

  describe('MR item', () => {
    beforeEach(() => {
      gitLabService.fetchCurrentPipelineProject.mockReturnValue(project);
      // FIXME: why is closing issue fetched from normal remote and pipeline result from pipeline remote?
      gitLabService.fetchCurrentProject.mockReturnValue(project);
      gitLabService.fetchLastPipelineForCurrentBranch.mockReturnValue(null);
    });

    afterEach(() => {
      statusBar.dispose();
    });

    it('shows MR item', async () => {
      gitLabService.fetchOpenMergeRequestForCurrentBranch.mockReturnValue(mr);
      await statusBar.init();
      expect(getMrItem().show).toHaveBeenCalled();
      expect(getMrItem().hide).not.toHaveBeenCalled();
      expect(getMrItem().text).toBe('$(git-pull-request) GitLab: MR !2000');
    });

    it('shows create MR text when there is no MR', async () => {
      gitLabService.fetchOpenMergeRequestForCurrentBranch.mockReturnValue(null);
      await statusBar.init();
      expect(getMrItem().text).toBe('$(git-pull-request) GitLab: Create MR.');
    });

    it('hides the MR item when there is no project', async () => {
      gitLabService.fetchCurrentProject.mockReturnValue(null);
      await statusBar.init();
      expect(getMrItem().hide).toHaveBeenCalled();
    });
  });
});
