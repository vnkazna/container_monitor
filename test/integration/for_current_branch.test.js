const assert = require('assert');
const CurrentBranchDataProvider = require('../../src/data_providers/current_branch').DataProvider;
const { tokenService } = require('../../src/services/token_service');
const openIssueResponse = require('./fixtures/rest/open_issue.json');
const pipelinesResopnse = require('./fixtures/rest/pipelines.json');
const pipelineResponse = require('./fixtures/rest/pipeline.json');
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

  before(async () => {
    server = getServer([
      createQueryJsonEndpoint('/projects/278964/pipelines', {
        '?ref=master': pipelinesResopnse,
      }),
      createJsonEndpoint('/projects/278964/pipelines/47', pipelineResponse),
      createQueryJsonEndpoint('/projects/278964/merge_requests', {
        '?state=opened&source_branch=master': [openMergeRequestResponse],
      }),
      createJsonEndpoint('/projects/278964/merge_requests/33824/closes_issues', [
        openIssueResponse,
      ]),
    ]);
    await tokenService.setToken(GITLAB_URL, 'abcd-secret');
  });

  beforeEach(() => {
    server.resetHandlers();
    dataProvider = new CurrentBranchDataProvider();
  });

  after(async () => {
    server.close();
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  it('shows pipeline, mr and closing issue for the current branch', async () => {
    const forCurrentPipeline = await dataProvider.getChildren();
    assert.deepStrictEqual(
      forCurrentPipeline.map(i => i.label),
      [
        'Pipeline #47 passed · Finished 4 years ago',
        '!33824 · Web IDE - remove unused actions (mappings)',
        '#219925 · Change primary button for editing on files',
      ],
    );
  });
});
