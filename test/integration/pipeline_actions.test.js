const assert = require('assert');
const sinon = require('sinon');
const { tokenService } = require('../../src/services/token_service');
const pipelinesResponse = require('./fixtures/rest/pipelines.json');
const {
  getServer,
  createTextEndpoint,
  createQueryJsonEndpoint,
  createPostEndpoint,
} = require('./test_infrastructure/mock_server');
const { GITLAB_URL } = require('./test_infrastructure/constants');
const { simulateQuickPickChoice } = require('./test_infrastructure/helpers');
const { showPicker } = require('../../src/pipeline_actions_picker');
const { currentBranchRefresher } = require('../../src/current_branch_refresher');

describe('Pipeline actions', async () => {
  let server;
  let refresherSpy;
  const sandbox = sinon.createSandbox();

  before(async () => {
    server = getServer([
      createQueryJsonEndpoint('/projects/278964/pipelines', { '?ref=master': pipelinesResponse }),
      createTextEndpoint(
        '/projects/278964/snippets/222/files/master/test2.js/raw',
        'second blob content',
      ),
      createPostEndpoint('/projects/278964/pipeline', pipelinesResponse[0]), // simulating returning a newly created pipeline
    ]);
    await tokenService.setToken(GITLAB_URL, 'abcd-secret');
  });

  beforeEach(async () => {
    server.resetHandlers();
    refresherSpy = sandbox.spy(currentBranchRefresher, 'refresh');
  });

  afterEach(async () => {
    sandbox.restore();
  });

  after(async () => {
    server.close();
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  it('creates a new pipeline', async () => {
    simulateQuickPickChoice(sandbox, 1); // Create a new pipeline from current branch
    await showPicker();

    assert(refresherSpy.calledOnce, 'status bar is refreshed after successful pipeline creation');
  });
});
