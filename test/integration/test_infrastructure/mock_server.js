const { setupServer } = require('msw/node');
const { rest } = require('msw');
const { GITLAB_HOST } = require('./constants');
const projectResponse = require('../fixtures/project.json');
const versionResponse = require('../fixtures/version.json');
const openIssueResponse = require('../fixtures/open_issue.json');
const openMergeRequestResponse = require('../fixtures/open_mr.json');
const pipelinesResponse = require('../fixtures/pipelines.json');
const pipelineResponse = require('../fixtures/pipeline.json');

const instancePrefix = `https://${GITLAB_HOST}/api/v4`;

const createEndpoint = (path, response) =>
  rest.get(`${instancePrefix}${path}`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(response));
  });

const notFoundByDefault = rest.get(/.*/, (req, res, ctx) => res(ctx.status(404)));

module.exports = () => {
  const server = setupServer(
    createEndpoint('/projects/gitlab-org%2Fgitlab', projectResponse),
    createEndpoint('/version', versionResponse),
    createEndpoint('/projects/278964/merge_requests?scope=assigned_to_me&state=opened', [
      openMergeRequestResponse,
    ]),
    createEndpoint('/projects/278964/issues?scope=assigned_to_me&state=opened', [
      openIssueResponse,
    ]),
    createEndpoint('/projects/278964/pipelines?ref=master', pipelinesResponse),
    createEndpoint('/projects/278964/pipelines/47', pipelineResponse),
    notFoundByDefault,
  );
  server.listen();
  return server;
};
