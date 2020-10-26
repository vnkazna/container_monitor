const assert = require('assert');
const IssuableDataProvider = require('../../src/data_providers/issuable').DataProvider;
const { tokenService } = require('../../src/services/token_service');
const getServer = require('./test_infrastructure/mock_server');
const { GITLAB_URL } = require('./test_infrastructure/constants');

describe('GitLab tree view', () => {
  let server;
  let dataProvider;

  before(async () => {
    server = getServer();
    await tokenService.setToken(GITLAB_URL, 'abcd-secret');
  });

  beforeEach(() => {
    server.resetHandlers();
    dataProvider = new IssuableDataProvider();
  });

  after(async () => {
    server.close();
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  /**
   * Opens a top level category from the extension issues tree view
   */
  async function openCategory(label) {
    const categories = await dataProvider.getChildren();
    const [chosenCategory] = categories.filter(c => c.label === label);
    assert(
      chosenCategory,
      `Can't open category ${label} because it's not present in ${categories}`,
    );
    return await dataProvider.getChildren(chosenCategory);
  }

  it('shows project issues assigned to me', async () => {
    const issuesAssignedToMe = await openCategory('Issues assigned to me');

    assert.strictEqual(issuesAssignedToMe.length, 1);
    assert.strictEqual(
      issuesAssignedToMe[0].label,
      '#219925 · Change primary button for editing on files',
    );
  });

  it('shows project merge requests assigned to me', async () => {
    const mergeRequestsAssignedToMe = await openCategory('Merge requests assigned to me');

    assert.strictEqual(mergeRequestsAssignedToMe.length, 1);
    assert.strictEqual(
      mergeRequestsAssignedToMe[0].label,
      '!33824 · Web IDE - remove unused actions (mappings)',
    );
  });
});
