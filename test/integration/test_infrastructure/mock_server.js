const { setupServer } = require('msw/node');
const { rest } = require('msw');
const { API_URL_PREFIX } = require('./constants');
const projectResponse = require('../fixtures/rest/project.json');
const versionResponse = require('../fixtures/rest/version.json');

const createJsonEndpoint = (path, response) =>
  rest.get(`${API_URL_PREFIX}${path}`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(response));
  });

const createQueryJsonEndpoint = (path, queryResponseMap) =>
  rest.get(`${API_URL_PREFIX}${path}`, (req, res, ctx) => {
    const response = queryResponseMap[req.url.search];
    if (!response) {
      console.warn(`API call ${req.url.toString()} doesn't have a query handler.`);
      return res(ctx.status(404));
    }
    return res(ctx.status(200), ctx.json(response));
  });

const createTextEndpoint = (path, response) =>
  rest.get(`${API_URL_PREFIX}${path}`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.text(response));
  });

const createPostEndpoint = (path, response) =>
  rest.post(`${API_URL_PREFIX}${path}`, (req, res, ctx) => {
    return res(ctx.status(201), ctx.json(response));
  });

const notFoundByDefault = rest.get(/.*/, (req, res, ctx) => {
  console.warn(`API call ${req.url.toString()} doesn't have a query handler.`);
  res(ctx.status(404));
});

const getServer = (handlers = []) => {
  const server = setupServer(
    createJsonEndpoint('/projects/gitlab-org%2Fgitlab', projectResponse),
    createJsonEndpoint('/version', versionResponse),
    ...handlers,
    notFoundByDefault,
  );
  server.listen();
  return server;
};

module.exports = {
  getServer,
  createJsonEndpoint,
  createQueryJsonEndpoint,
  createTextEndpoint,
  createPostEndpoint,
};
