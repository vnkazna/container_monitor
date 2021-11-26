import { GraphQLClient } from 'graphql-request';
import crossFetch from 'cross-fetch';
import { fetchJson, GitLabNewService } from './gitlab_new_service';
import { testSnippet1 } from '../../test/integration/fixtures/graphql/snippets.js';
import { DEFAULT_FETCH_RESPONSE } from '../__mocks__/cross-fetch';
import { CustomQueryType } from './custom_query_type';
import { CustomQuery } from './custom_query';
import { asMock } from '../test_utils/as_mock';
import { project } from '../test_utils/entities';
import { getExtensionConfiguration } from '../utils/extension_configuration';
import { getHttpAgentOptions } from '../utils/get_http_agent_options';

jest.mock('graphql-request');
jest.mock('../services/token_service');
jest.mock('cross-fetch');
jest.mock('../utils/extension_configuration');
jest.mock('../utils/get_http_agent_options');

const crossFetchCallArgument = () => (crossFetch as jest.Mock).mock.calls[0][0];
const crossFetchResponse = (response?: unknown) => ({ ok: true, json: async () => response });
describe('gitlab_new_service', () => {
  beforeEach(() => {
    asMock(getHttpAgentOptions).mockReturnValue({});
  });
  const EXAMPLE_PROJECT_ID = 12345;

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

  describe('getSnippetContent uses REST for older GitLab versions', () => {
    it.each`
      rawPath                                                                                           | branch
      ${'/gitlab-org/gitlab-vscode-extension/-/snippets/111/raw/master/okr.md'}                         | ${'master'}
      ${'/gitlab-org/gitlab-vscode-extension/-/snippets/111/raw/main/okr.md'}                           | ${'main'}
      ${'/gitlab-org/security/gitlab-vscode-extension/-/snippets/222/raw/customBranch/folder/test1.js'} | ${'customBranch'}
    `('parses the repository branch from blob rawPath', async ({ rawPath, branch }) => {
      const service = new GitLabNewService('https://example.com');
      service.getVersion = async () => '14.0.0';
      const snippet = testSnippet1;
      const blob = snippet.blobs.nodes[0];

      await service.getSnippetContent(snippet, { ...blob, rawPath });

      expect(crossFetchCallArgument()).toMatch(`/files/${branch}/`);
    });
  });

  describe('getFileContent', () => {
    describe('fetch request', () => {
      it.each`
        ref                                                    | encodedRef
        ${'feature/ch38/add-fn-para-criar-novo-usuário'}       | ${'feature%2Fch38%2Fadd-fn-para-criar-novo-usu%C3%A1rio'}
        ${'förbättra-användarupplevelsen-av-chattkomponenten'} | ${'f%C3%B6rb%C3%A4ttra-anv%C3%A4ndarupplevelsen-av-chattkomponenten'}
        ${'erhöhe-preis-auf-dreißig-euro'}                     | ${'erh%C3%B6he-preis-auf-drei%C3%9Fig-euro'}
        ${'fix-error-400-when-on-a-branch'}                    | ${'fix-error-400-when-on-a-branch'}
      `('makes a request and escapes ref $ref', async ({ ref, encodedRef }) => {
        const baseUrl =
          'https://gitlab.example.com/api/v4/projects/12345/repository/files/README.md/raw?ref=';
        const service = new GitLabNewService('https://gitlab.example.com');
        const result = await service.getFileContent('README.md', ref, EXAMPLE_PROJECT_ID);

        expect(crossFetch).toHaveBeenCalledWith(`${baseUrl}${encodedRef}`, expect.anything());

        expect(result).toBe(DEFAULT_FETCH_RESPONSE);
      });

      it.each`
        file                                           | encodedFile
        ${'README.md'}                                 | ${'README.md'}
        ${'src/com/example/App.java'}                  | ${'src%2Fcom%2Fexample%2FApp.java'}
        ${'.settings/Production Settings/windows.ini'} | ${'.settings%2FProduction%20Settings%2Fwindows.ini'}
      `('makes a request and escapes file $file', async ({ file, encodedFile }) => {
        const url = `https://gitlab.example.com/api/v4/projects/12345/repository/files/${encodedFile}/raw?ref=main`;
        const service = new GitLabNewService('https://gitlab.example.com');
        const result = await service.getFileContent(file, 'main', EXAMPLE_PROJECT_ID);

        expect(crossFetch).toBeCalledTimes(1);
        expect((crossFetch as jest.Mock).mock.calls[0][0]).toBe(url);

        expect(result).toBe(DEFAULT_FETCH_RESPONSE);
      });
    });

    it('encodes the project path', async () => {
      const service = new GitLabNewService('https://gitlab.example.com');
      await service.getFileContent('foo', 'bar', 'baz/bat');
      expect(crossFetch).toHaveBeenCalledWith(
        'https://gitlab.example.com/api/v4/projects/baz%2Fbat/repository/files/foo/raw?ref=bar',
        expect.anything(),
      );
    });
  });

  describe('getFile', () => {
    it('constructs the correct URL', async () => {
      const service = new GitLabNewService('https://gitlab.example.com');
      await service.getFile('foo', 'bar', 12345);
      expect(crossFetch).toHaveBeenCalledWith(
        'https://gitlab.example.com/api/v4/projects/12345/repository/files/foo?ref=bar',
        expect.anything(),
      );
    });

    it('encodes the project path', async () => {
      const service = new GitLabNewService('https://gitlab.example.com');
      await service.getFile('foo', 'bar', 'baz/bat');
      expect(crossFetch).toHaveBeenCalledWith(
        'https://gitlab.example.com/api/v4/projects/baz%2Fbat/repository/files/foo?ref=bar',
        expect.anything(),
      );
    });
  });

  describe('getTree', () => {
    it('constructs the correct URL', async () => {
      const service = new GitLabNewService('https://gitlab.example.com');
      await service.getTree('foo', 'bar', 12345);
      expect(crossFetch).toHaveBeenCalledWith(
        'https://gitlab.example.com/api/v4/projects/12345/repository/tree?ref=bar&path=foo',
        expect.anything(),
      );
    });

    it('encodes the project path', async () => {
      const service = new GitLabNewService('https://gitlab.example.com');
      await service.getTree('foo', 'bar', 'baz/bat');
      expect(crossFetch).toHaveBeenCalledWith(
        'https://gitlab.example.com/api/v4/projects/baz%2Fbat/repository/tree?ref=bar&path=foo',
        expect.anything(),
      );
    });
  });
  describe('fetchIssueables', () => {
    let gitLabService: GitLabNewService;

    beforeEach(() => {
      gitLabService = new GitLabNewService(`http://gitlab.example.com`);
      asMock(crossFetch).mockResolvedValue(crossFetchResponse([]));
      asMock(getExtensionConfiguration).mockReturnValue({});
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    const defaultParams: CustomQuery = {
      name: 'test query',
      noItemText: 'no items',
      type: CustomQueryType.MR,
      scope: 'all',
      state: 'opened',
      wip: '',
      searchIn: '',
      confidential: false,
      excludeLabels: undefined,
      excludeMilestone: undefined,
      excludeAuthor: undefined,
      excludeAssignee: undefined,
      excludeSearch: undefined,
      excludeSearchIn: '',
      labels: undefined,
      milestone: undefined,
      search: undefined,
      createdBefore: undefined,
      createdAfter: undefined,
      updatedBefore: undefined,
      updatedAfter: undefined,
      orderBy: '',
      sort: '',
      maxResults: 20,
      reportTypes: undefined,
      severityLevels: undefined,
      confidenceLevels: undefined,
    };

    const getFetchedUrl = () => asMock(crossFetch).mock.calls[0][0];
    const getFetchedParams = () => new URLSearchParams(asMock(crossFetch).mock.calls[0][0]);

    describe('handles types', () => {
      it.each`
        type                             | scope               | expectation
        ${CustomQueryType.VULNERABILITY} | ${'all'}            | ${'all'}
        ${CustomQueryType.VULNERABILITY} | ${'dismissed'}      | ${'dismissed'}
        ${CustomQueryType.ISSUE}         | ${'all'}            | ${'all'}
        ${CustomQueryType.ISSUE}         | ${'assigned_to_me'} | ${'assigned_to_me'}
        ${CustomQueryType.ISSUE}         | ${'created_by_me'}  | ${'created_by_me'}
        ${CustomQueryType.MR}            | ${'all'}            | ${'all'}
        ${CustomQueryType.MR}            | ${'assigned_to_me'} | ${'assigned_to_me'}
        ${CustomQueryType.MR}            | ${'created_by_me'}  | ${'created_by_me'}
      `('sets scope based on type: $type', async ({ type, scope, expectation }) => {
        await gitLabService.getIssuables({ ...defaultParams, scope, type }, project);
        expect(getFetchedUrl()).toContain(expectation);
      });

      it.each`
        type                             | scope    | queries                                | path
        ${CustomQueryType.EPIC}          | ${'all'} | ${{ include_ancestor_groups: 'true' }} | ${'/groups/9970/epics'}
        ${CustomQueryType.VULNERABILITY} | ${'all'} | ${{ scope: 'all' }}                    | ${'/projects/5261717/vulnerability_findings'}
        ${CustomQueryType.MR}            | ${'all'} | ${{ scope: 'all' }}                    | ${'/projects/5261717/merge_requests'}
      `('sets path based on type: $type', async ({ type, scope, queries, path }) => {
        await gitLabService.getIssuables({ ...defaultParams, scope, type }, project);
        const url = getFetchedUrl();
        expect(url).toContain(path);
        Object.entries(queries).forEach(([key, query]) => {
          expect(getFetchedParams().get(key)).toEqual(query);
        });
      });
    });

    describe('author parameters', () => {
      it('sets no author parameter', async () => {
        await gitLabService.getIssuables(
          { ...defaultParams, type: CustomQueryType.ISSUE },
          project,
        );
        expect(getFetchedParams().get('author_username')).toBeNull();
        expect(getFetchedParams().get('author_id')).toBeNull();
      });

      it('sets author_username parameter', async () => {
        await gitLabService.getIssuables(
          { ...defaultParams, type: CustomQueryType.ISSUE, author: 'testuser' },
          project,
        );
        expect(getFetchedParams().get('author_username')).toEqual('testuser');
        expect(getFetchedParams().get('author_id')).toBeNull();
      });

      it('sets author_id parameter if author is found', async () => {
        gitLabService.getFirstUserByUsername = async () => ({ id: 1 } as RestUser);
        await gitLabService.getIssuables(
          { ...defaultParams, type: CustomQueryType.MR, author: 'testuser' },
          project,
        );
        expect(getFetchedParams().get('author_username')).toBeNull();
        expect(getFetchedParams().get('author_id')).toEqual('1');
      });
    });

    describe('assignee parameters', () => {
      it('sets assignee_username parameter', async () => {
        await gitLabService.getIssuables(
          { ...defaultParams, type: CustomQueryType.ISSUE, assignee: 'testuser' },
          project,
        );
        expect(getFetchedParams().get('assignee_username')).toEqual('testuser');
        expect(getFetchedParams().get('assignee_id')).toBeNull();
      });

      it('sets assignee_id parameter if assignee is found', async () => {
        gitLabService.getFirstUserByUsername = async () => ({ id: 1 } as RestUser);
        await gitLabService.getIssuables(
          { ...defaultParams, type: CustomQueryType.MR, assignee: 'testuser' },
          project,
        );
        expect(getFetchedParams().get('assignee_username')).toBeNull();
        expect(getFetchedParams().get('assignee_id')).toEqual('1');
      });

      it.each(['Any', 'None'])('Uses %s directly', async param => {
        await gitLabService.getIssuables(
          { ...defaultParams, type: CustomQueryType.MR, assignee: param },
          project,
        );
        expect(getFetchedParams().get('assignee_id')).toEqual(param);
      });
    });

    it('sets reviewer parameter', async () => {
      await gitLabService.getIssuables(
        { ...defaultParams, type: CustomQueryType.ISSUE, reviewer: 'reviewer' },
        project,
      );
      expect(getFetchedParams().get('reviewer_username')).toEqual('reviewer');
    });

    describe('searchIn parameters', () => {
      it('sets "all" parameter', async () => {
        await gitLabService.getIssuables({ ...defaultParams, searchIn: 'all' }, project);
        expect(getFetchedParams().get('in')).toEqual('title,description');
      });

      it('sets "in" parameter', async () => {
        await gitLabService.getIssuables({ ...defaultParams, searchIn: 'title' }, project);
        expect(getFetchedParams().get('in')).toEqual('title');
      });
    });

    describe('WIP/Draft', () => {
      it('sets wip parameter', async () => {
        await gitLabService.getIssuables({ ...defaultParams, wip: 'true' }, project);
        expect(getFetchedParams().get('wip')).toEqual('true');
      });
    });

    describe('misc query parameters', () => {
      it('sets query parameters', async () => {
        await gitLabService.getIssuables(
          {
            ...defaultParams,
            type: CustomQueryType.ISSUE,
            confidential: true,
            excludeLabels: ['label1', 'label2'],
            excludeMilestone: 'excludeMilestone',
            excludeAuthor: 'excludeAuthor',
            excludeAssignee: 'excludeAssignee',
            excludeSearch: 'excludeSearch',
            excludeSearchIn: 'excludeSearchIn',
            labels: ['label1', 'label2'],
            milestone: 'milestone',
            search: 'search',
            createdBefore: '2020-10-11T03:45:40Z',
            createdAfter: '2018-11-01T03:45:40Z',
            updatedBefore: '2020-10-30T03:45:40Z',
            updatedAfter: '2018-11-01T03:45:40Z',
            orderBy: 'orderBy',
            sort: 'sort',
            maxResults: 20,
            reportTypes: ['reportType1', 'reportType2'],
            severityLevels: ['severityLevel1', 'severityLevel2'],
            confidenceLevels: ['confidenceLevel1', 'confidenceLevel2'],
          },
          project,
        );
        const params = getFetchedParams();

        expect(params.get('confidential')).toEqual('true');
        expect(params.get('not[labels]')).toEqual('label1,label2');
        expect(params.get('not[milestone]')).toEqual('excludeMilestone');
        expect(params.get('not[author_username]')).toEqual('excludeAuthor');
        expect(params.get('not[assignee_username]')).toEqual('excludeAssignee');
        expect(params.get('not[search]')).toEqual('excludeSearch');
        expect(params.get('not[in]')).toEqual('excludeSearchIn');
        expect(params.get('labels')).toEqual('label1,label2');
        expect(params.get('milestone')).toEqual('milestone');
        expect(params.get('search')).toEqual('search');
        expect(params.get('created_before')).toEqual('2020-10-11T03:45:40Z');
        expect(params.get('created_after')).toEqual('2018-11-01T03:45:40Z');
        expect(params.get('updated_before')).toEqual('2020-10-30T03:45:40Z');
        expect(params.get('updated_after')).toEqual('2018-11-01T03:45:40Z');
        expect(params.get('order_by')).toEqual('orderBy');
        expect(params.get('sort')).toEqual('sort');
        expect(params.get('per_page')).toEqual('20');
        expect(params.get('report_type')).toEqual('reportType1,reportType2');
        expect(params.get('severity')).toEqual('severityLevel1,severityLevel2');
        expect(params.get('confidence')).toEqual('confidenceLevel1,confidenceLevel2');
      });
    });
  });
});

describe('fetchJson', () => {
  beforeEach(() => {
    asMock(crossFetch).mockResolvedValue(crossFetchResponse());
  });

  it('handles an empty query', async () => {
    await fetchJson('', 'https://example.com', {});
    expect(crossFetch).toHaveBeenCalledWith('https://example.com?', expect.anything());
  });

  it('handles a non-empty query', async () => {
    await fetchJson('', 'https://example.com', {}, { foo: 'bar' });
    expect(crossFetch).toHaveBeenCalledWith('https://example.com?foo=bar', expect.anything());
  });

  it('ignores an undefined query value', async () => {
    await fetchJson('', 'https://example.com', {}, { foo: undefined });
    expect(crossFetch).toHaveBeenCalledWith('https://example.com?', expect.anything());
  });

  it('ignores a null query value', async () => {
    await fetchJson('', 'https://example.com', {}, { foo: null });
    expect(crossFetch).toHaveBeenCalledWith('https://example.com?', expect.anything());
  });

  it('does not ignore a falsy value', async () => {
    await fetchJson('', 'https://example.com', {}, { foo: '' });
    expect(crossFetch).toHaveBeenCalledWith('https://example.com?foo=', expect.anything());
  });
});
