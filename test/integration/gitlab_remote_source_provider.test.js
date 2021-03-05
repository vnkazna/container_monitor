const assert = require('assert');
const { graphql } = require('msw');
const { tokenService } = require('../../src/services/token_service');
const projectsResponse = require('./fixtures/graphql/projects.json');
const remoteSourceResult = require('./fixtures/git_api/remote_sources.json');
const { getServer } = require('./test_infrastructure/mock_server.js');
const { GITLAB_URL } = require('./test_infrastructure/constants');
const {
  GitLabRemoteSourceProvider,
} = require('../../src/gitlab/clone/gitlab_remote_source_provider');

const token = 'abcd-secret';

describe('GitLab Remote Source provider', () => {
  let server;

  before(async () => {
    server = getServer([
      graphql.query('GetProjects', (req, res, ctx) => {
        if (req.variables.search === 'GitLab') return res(ctx.data(projectsResponse));
        if (req.variables.search === 'nonexistent') return res(ctx.data({ projects: null }));
        return res(ctx.data(projectsResponse));
      }),
    ]);
    await tokenService.setToken(GITLAB_URL, token);
  });

  after(async () => {
    server.close();
    await tokenService.setToken(GITLAB_URL, undefined);
  });

  it('projects are fetched with full search', async () => {
    const sourceProvider = new GitLabRemoteSourceProvider(GITLAB_URL);

    assert.deepStrictEqual(
      await sourceProvider.getRemoteSources(),
      remoteSourceResult,
      'full search should return one result',
    );
  });

  it('project search returns one result', async () => {
    const sourceProvider = new GitLabRemoteSourceProvider(GITLAB_URL);

    assert.deepStrictEqual(
      await sourceProvider.getRemoteSources('GitLab'),
      remoteSourceResult,
      'search for "GitLab" should return one result',
    );
  });

  it('projects search with nonexistent project returns no result', async () => {
    const sourceProvider = new GitLabRemoteSourceProvider(GITLAB_URL);

    assert.deepStrictEqual(
      await sourceProvider.getRemoteSources('nonexistent'),
      [],
      'search for "nonexistent" repository should return no result',
    );
  });
});
