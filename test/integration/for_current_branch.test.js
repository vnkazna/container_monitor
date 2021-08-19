const assert = require('assert');
const dayjs = require('dayjs');
const { CurrentBranchDataProvider } = require('../../src/tree_view/current_branch_data_provider');
const { tokenService } = require('../../src/services/token_service');
const openIssueResponse = require('./fixtures/rest/open_issue.json');
const pipelinesResponse = require('./fixtures/rest/pipelines.json');
const openMergeRequestResponse = require('./fixtures/rest/open_mr.json');
const {
  getServer,
  createQueryJsonEndpoint,
  createJsonEndpoint,
} = require('./test_infrastructure/mock_server');
const { GITLAB_URL } = require('./test_infrastructure/constants');

describe('GitLab tree view for current branch', () => {
  let server;
  let dataProvider;

  const fourYearsAgo = dayjs().subtract(4, 'year');

  const pipelinesResponseWithFixedDate = [
    { ...pipelinesResponse[0], updated_at: fourYearsAgo.toISOString() },
    ...pipelinesResponse.slice(1, pipelinesResponse.length),
  ];

  const pipelinesEndpoint = createQueryJsonEndpoint('/projects/278964/pipelines', {
    '?ref=master': pipelinesResponseWithFixedDate,
  });
  const pipelinesForMrEndpoint = createJsonEndpoint(
    '/projects/278964/merge_requests/33824/pipelines',
    pipelinesResponseWithFixedDate,
  );

  const mrEndpoint = createQueryJsonEndpoint('/projects/278964/merge_requests', {
    '?state=opened&source_branch=master': [openMergeRequestResponse],
  });
  const issueEndpoint = createJsonEndpoint('/projects/278964/merge_requests/33824/closes_issues', [
    openIssueResponse,
  ]);

  before(async () => {
    await tokenService.setToken(GITLAB_URL, 'abcd-secret');
  });

  beforeEach(() => {
    dataProvider = new CurrentBranchDataProvider();
  });

  afterEach(() => {
    server.close();
  });

  after(async () => {
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  it('shows detached pipeline and mr for the current branch', async () => {
    server = getServer([pipelinesForMrEndpoint, mrEndpoint]);
    const forCurrentBranch = await dataProvider.getChildren();
    assert.deepStrictEqual(
      forCurrentBranch.map(i => dataProvider.getTreeItem(i).label),
      [
        'Pipeline #47',
        '!33824 · Web IDE - remove unused actions (mappings)',
        'No closing issue found',
      ],
    );
  });

  it('shows standard pipeline, mr and closing issue for the current branch', async () => {
    server = getServer([pipelinesEndpoint, mrEndpoint, issueEndpoint]);
    const forCurrentBranch = await dataProvider.getChildren();
    assert.deepStrictEqual(
      forCurrentBranch.map(i => dataProvider.getTreeItem(i).label),
      [
        'Pipeline #47',
        '!33824 · Web IDE - remove unused actions (mappings)',
        '#219925 · Change primary button for editing on files',
      ],
    );
  });

  it('handles error for pipeline API request', async () => {
    server = getServer([mrEndpoint, issueEndpoint]);
    const forCurrentBranch = await dataProvider.getChildren();
    assert.deepStrictEqual(
      forCurrentBranch.map(i => dataProvider.getTreeItem(i).label),
      [
        'No pipeline found',
        '!33824 · Web IDE - remove unused actions (mappings)',
        '#219925 · Change primary button for editing on files',
      ],
    );
  });

  it('handles error for MR API request', async () => {
    server = getServer([pipelinesEndpoint]);
    const forCurrentBranch = await dataProvider.getChildren();
    assert.deepStrictEqual(
      forCurrentBranch.map(i => dataProvider.getTreeItem(i).label),
      ['Pipeline #47', 'No merge request found', 'No closing issue found'],
    );
  });

  it('handles error for issue API request', async () => {
    server = getServer([pipelinesEndpoint, mrEndpoint]);
    const forCurrentBranch = await dataProvider.getChildren();
    assert.deepStrictEqual(
      forCurrentBranch.map(i => dataProvider.getTreeItem(i).label),
      [
        'Pipeline #47',
        '!33824 · Web IDE - remove unused actions (mappings)',
        'No closing issue found',
      ],
    );
  });
});
