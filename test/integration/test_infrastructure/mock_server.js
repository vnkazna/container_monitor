const { setupServer } = require('msw/node');
const { rest, graphql } = require('msw');
const { API_URL_PREFIX } = require('./constants');
const projectResponse = require('../fixtures/rest/project.json');
const versionResponse = require('../fixtures/rest/version.json');
const openIssueResponse = require('../fixtures/rest/open_issue.json');
const openMergeRequestResponse = require('../fixtures/rest/open_mr.json');
const pipelinesResponse = require('../fixtures/rest/pipelines.json');
const pipelineResponse = require('../fixtures/rest/pipeline.json');
const snippetsResponse = require('../fixtures/graphql/snippets.json');

const createJsonEndpoint = (path, response) =>
  rest.get(`${API_URL_PREFIX}${path}`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(response));
  });

const createTextEndpoint = (path, response) =>
  rest.get(`${API_URL_PREFIX}${path}`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.text(response));
  });

const notFoundByDefault = rest.get(/.*/, (req, res, ctx) => res(ctx.status(404)));

module.exports = () => {
  const server = setupServer(
    createJsonEndpoint('/projects/gitlab-org%2Fgitlab', projectResponse),
    createJsonEndpoint('/version', versionResponse),
    createJsonEndpoint('/projects/278964/merge_requests?scope=assigned_to_me&state=opened', [
      openMergeRequestResponse,
    ]),
    createJsonEndpoint('/projects/278964/issues?scope=assigned_to_me&state=opened', [
      openIssueResponse,
    ]),
    createJsonEndpoint('/projects/278964/pipelines?ref=master', pipelinesResponse),
    createJsonEndpoint('/projects/278964/pipelines/47', pipelineResponse),
    createTextEndpoint('/projects/278964/snippets/111/files/master/test.js/raw', 'snippet content'),
    createTextEndpoint(
      '/projects/278964/snippets/222/files/master/test2.js/raw',
      'second blob content',
    ),
    graphql.query('GetSnippets', (req, res, ctx) => {
      if (req.variables.projectPath === 'gitlab-org/gitlab') return res(ctx.data(snippetsResponse));
      return res(ctx.data({ project: null }));
    }),
    notFoundByDefault,
  );
  server.listen();
  return server;
};
