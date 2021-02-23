import * as assert from 'assert';
import { graphql } from 'msw';
import { tokenService } from '../../src/services/token_service';
import * as projectsResponse from './fixtures/graphql/projects.json';
import * as remoteSourceResult from './fixtures/git_api/remote_sources.json';
import { getServer } from './test_infrastructure/mock_server.js';
import { GITLAB_URL } from './test_infrastructure/constants';
import { GitLabRemoteSourceProvider } from '../../src/gitlab/clone/gitlab_remote_source_provider';

const token = 'abcd-secret';

describe('GitLab Remote Source provider', () => {
  let server: {
    close(): void;
  };

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
