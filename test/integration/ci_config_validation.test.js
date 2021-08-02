const sinon = require('sinon');
const assert = require('assert');
const vscode = require('vscode');
const { rest } = require('msw');
const { tokenService } = require('../../src/services/token_service');
const validCiLintResponse = require('./fixtures/rest/ci_lint_valid.json');
const invalidCiLintResponse = require('./fixtures/rest/ci_lint_invalid.json');
const { getServer } = require('./test_infrastructure/mock_server');
const { GITLAB_URL, API_URL_PREFIX } = require('./test_infrastructure/constants');
const {
  createAndOpenFile,
  closeAndDeleteFile,
  getRepositoryRoot,
  insertTextIntoActiveEditor,
} = require('./test_infrastructure/helpers');
const { validate } = require('../../src/ci_config_validator');

describe('Validate CI config', async () => {
  let server;
  let testFileUri;
  const VALID_CI_CONFIG = [`test:`, `  stage: test`, `  script:`, `    - echo 1`].join(['\n']);
  const INVALID_CI_CONFIG = [`test:`, `  stage: test`, `  scccript:`, `    - echo 1`].join(['\n']);
  const sandbox = sinon.createSandbox();

  before(async () => {
    server = getServer([
      rest.post(`${API_URL_PREFIX}/projects/278964/ci/lint`, (req, res, ctx) => {
        switch (req.body.content) {
          case VALID_CI_CONFIG:
            return res(ctx.status(200), ctx.json(validCiLintResponse));
          case INVALID_CI_CONFIG:
            return res(ctx.status(200), ctx.json(invalidCiLintResponse));
          default:
            return res(ctx.status(500), ctx.text('No response for the config'));
        }
      }),
    ]);
    await tokenService.setToken(GITLAB_URL, 'abcd-secret');
  });

  beforeEach(async () => {
    server.resetHandlers();
    testFileUri = vscode.Uri.parse(`${getRepositoryRoot()}/.gitlab-ci.yml`);
    await createAndOpenFile(testFileUri);
  });

  afterEach(async () => {
    sandbox.restore();
    await closeAndDeleteFile(testFileUri);
  });

  after(async () => {
    server.close();
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  it('shows info message for valid config', async () => {
    const informationMessageMock = sandbox
      .mock(vscode.window)
      .expects('showInformationMessage')
      .withArgs('GitLab Workflow: Your CI configuration is valid.')
      .resolves();
    await insertTextIntoActiveEditor(VALID_CI_CONFIG);

    await validate();

    informationMessageMock.verify();
  });

  it('shows error message for invalid config', async () => {
    const errorMessages = [];
    sandbox.stub(vscode.window, 'showErrorMessage').callsFake(async msg => {
      errorMessages.push(msg);
    });
    await insertTextIntoActiveEditor(INVALID_CI_CONFIG);

    await validate();

    assert.deepStrictEqual(errorMessages, [
      'GitLab Workflow: Invalid CI configuration.',
      'jobs:test config contains unknown keys: scccript',
    ]);
  });
});
