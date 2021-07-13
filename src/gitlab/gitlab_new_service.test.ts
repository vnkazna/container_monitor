import { GraphQLClient } from 'graphql-request';
import crossFetch from 'cross-fetch';
import { GitLabNewService } from './gitlab_new_service';
import { testSnippet1 } from '../../test/integration/fixtures/graphql/snippets.js';

jest.mock('graphql-request');
jest.mock('../services/token_service');
jest.mock('cross-fetch');

const crossFetchCallArgument = () => (crossFetch as jest.Mock).mock.calls[0][0];

describe('gitlab_new_service', () => {
  describe('GraphQL client initialization', () => {
    it.each`
      instanceUrl                   | endpointUrl
      ${'https://test.com'}         | ${'https://test.com/api/graphql'}
      ${'https://test.com/gitlab'}  | ${'https://test.com/gitlab/api/graphql'}
      ${'https://test.com/gitlab/'} | ${'https://test.com/gitlab/api/graphql'}
    `('creates endpoint url from $instanceUrl', ({ instanceUrl, endpointUrl }) => {
      const service = new GitLabNewService(instanceUrl);

      expect(GraphQLClient).toHaveBeenCalledWith(endpointUrl, expect.anything());
    });
  });

  describe('getSnippetContent', () => {
    it.each`
      rawPath                                                                                           | branch
      ${'/gitlab-org/gitlab-vscode-extension/-/snippets/111/raw/master/okr.md'}                         | ${'master'}
      ${'/gitlab-org/gitlab-vscode-extension/-/snippets/111/raw/main/okr.md'}                           | ${'main'}
      ${'/gitlab-org/security/gitlab-vscode-extension/-/snippets/222/raw/customBranch/folder/test1.js'} | ${'customBranch'}
    `('parses the repository branch from blob rawPath', async ({ rawPath, branch }) => {
      (crossFetch as jest.Mock).mockResolvedValue({ ok: true, text: () => '' });
      const service = new GitLabNewService('https://example.com');
      const snippet = testSnippet1;
      const blob = snippet.blobs.nodes[0];

      await service.getSnippetContent(snippet, { ...blob, rawPath });

      expect(crossFetchCallArgument()).toMatch(`/files/${branch}/`);
    });
  });
});
