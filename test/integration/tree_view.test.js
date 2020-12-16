const assert = require('assert');
const vscode = require('vscode');
const IssuableDataProvider = require('../../src/data_providers/issuable').DataProvider;
const { tokenService } = require('../../src/services/token_service');
const openIssueResponse = require('./fixtures/rest/open_issue.json');
const openMergeRequestResponse = require('./fixtures/rest/open_mr.json');
const userResponse = require('./fixtures/rest/user.json');
const versionsResponse = require('./fixtures/rest/versions.json');
const versionResponse = require('./fixtures/rest/mr_version.json');
const {
  getServer,
  createQueryJsonEndpoint,
  createJsonEndpoint,
  createQueryTextEndpoint,
} = require('./test_infrastructure/mock_server');
const { GITLAB_URL } = require('./test_infrastructure/constants');
const { ApiContentProvider } = require('../../src/review/api_content_provider');
const { PROGRAMMATIC_COMMANDS } = require('../../src/command_names');

describe('GitLab tree view', () => {
  let server;
  let dataProvider;

  const customQuerySettings = [
    {
      name: 'Issues assigned to me',
      type: 'issues',
      scope: 'assigned_to_me',
      state: 'opened',
      noItemText: 'There is no issue assigned to you.',
    },
    {
      name: 'Merge requests assigned to me',
      type: 'merge_requests',
      scope: 'assigned_to_me',
      state: 'opened',
      noItemText: 'There is no MR assigned to you.',
    },
    {
      name: 'Custom GitLab Query for MR',
      type: 'merge_requests',
      scope: 'assigned_to_me',
      state: 'all',
      noItemText: 'There is no MR assigned to you.',
      maxResults: 30,
      labels: ['frontend', 'backend'],
      milestone: '13.6',
      author: 'johndoe',
      assignee: 'johndoe',
      search: 'query',
      createdBefore: '2020-10-11T03:45:40Z',
      createdAfter: '2018-11-01T03:45:40Z',
      updatedBefore: '2020-10-30T03:45:40Z',
      updatedAfter: '2018-11-01T03:45:40Z',
      wip: 'yes',
      orderBy: 'updated_at',
      sort: 'asc',
    },
    {
      name: 'Custom GitLab Query for issues',
      type: 'issues',
      scope: 'assigned_to_me',
      state: 'opened',
      noItemText: 'There is no Issue assigned to you.',
      confidential: true,
      excludeLabels: ['backstage'],
      excludeMilestone: ['13.5'],
      excludeAuthor: 'johndoe',
      excludeAssignee: 'johndoe',
      excludeSearch: 'bug',
      excludeSearchIn: 'description',
    },
  ];

  before(async () => {
    server = getServer([
      createQueryJsonEndpoint('/users', {
        '?username=johndoe': [userResponse],
      }),
      createQueryJsonEndpoint('/projects/278964/merge_requests', {
        '?scope=assigned_to_me&state=opened': [openMergeRequestResponse],
        '?scope=assigned_to_me&state=all&author_id=7237201&assignee_id=7237201&wip=yes&labels=frontend,backend&milestone=13.6&search=query&created_before=2020-10-11T03:45:40Z&created_after=2018-11-01T03:45:40Z&updated_before=2020-10-30T03:45:40Z&updated_after=2018-11-01T03:45:40Z&order_by=updated_at&sort=asc&per_page=30': [
          { ...openMergeRequestResponse, title: 'Custom Query MR' },
        ],
      }),
      createJsonEndpoint('/projects/278964/merge_requests/33824/versions', versionsResponse),
      createJsonEndpoint(
        '/projects/278964/merge_requests/33824/versions/127919672',
        versionResponse,
      ),
      createQueryJsonEndpoint('/projects/278964/issues', {
        '?scope=assigned_to_me&state=opened': [openIssueResponse],
        '?scope=assigned_to_me&state=opened&confidential=true&not[labels]=backstage&not[milestone]=13.5&not[author_username]=johndoe&not[assignee_username]=johndoe&not[search]=bug&not[in]=description': [
          { ...openIssueResponse, title: 'Custom Query Issue' },
        ],
      }),
      createQueryTextEndpoint(`/projects/278964/repository/files/src%2Ftest.js/raw`, {
        '?ref=1f0fa02de1f6b913d674a8be10899fb8540237a9': 'Old Version',
        '?ref=b6d6f6fd17b52b8cf4e961218c572805e9aa7463': 'New Version',
      }),
    ]);
    await tokenService.setToken(GITLAB_URL, 'abcd-secret');
    await vscode.workspace.getConfiguration().update('gitlab.customQueries', customQuerySettings);
  });

  beforeEach(() => {
    server.resetHandlers();
    dataProvider = new IssuableDataProvider();
  });

  after(async () => {
    server.close();
    await tokenService.setToken(GITLAB_URL, undefined);
    await vscode.workspace.getConfiguration().update('gitlab.customQueries', undefined);
  });

  /**
   * Opens a top level category from the extension issues tree view
   */
  async function openCategory(label) {
    const categories = await dataProvider.getChildren();
    const [chosenCategory] = categories.filter(c => c.label === label);
    assert(
      chosenCategory,
      `Can't open category ${label} because it's not present in ${categories.map(c => c.label)}`,
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

  it('shows project merge requests assigned to me with changed files', async () => {
    const mergeRequestsAssignedToMe = await openCategory('Merge requests assigned to me');

    assert.strictEqual(mergeRequestsAssignedToMe.length, 1);
    const mrItem = mergeRequestsAssignedToMe[0];
    assert.strictEqual(mrItem.label, '!33824 · Web IDE - remove unused actions (mappings)');
    assert.strictEqual(
      mrItem.iconPath.toString(true),
      'https://secure.gravatar.com/avatar/6042a9152ada74d9fb6a0cdce895337e?s=80&d=identicon',
    );

    const mrContent = await dataProvider.getChildren(mrItem);
    assert.strictEqual(mrContent[0].label, 'Description');

    const mrFiles = mrContent.slice(1);
    assert.deepStrictEqual(
      mrFiles.map(f => f.resourceUri.path),
      [
        '/.deleted.yml',
        '/README1.md',
        '/new_file.ts',
        '/src/test.js',
        '/src/assets/insert-multi-file-snippet.gif',
        '/Screenshot.png',
      ],
    );
    assert.deepStrictEqual(
      mrFiles.map(f => f.description),
      ['[deleted] /', '[renamed] /', '[added] /', '/src', '[added] /src/assets', '[renamed] /'],
    );
  });

  describe('clicking on a changed file', () => {
    let mrFiles;

    const getItem = filePath => mrFiles.filter(f => f.resourceUri.path === filePath).pop();

    const getDiffArgs = item => {
      assert.strictEqual(item.command.command, 'vscode.diff');
      return item.command.arguments;
    };

    before(async () => {
      const mergeRequestsAssignedToMe = await openCategory('Merge requests assigned to me');

      assert.strictEqual(mergeRequestsAssignedToMe.length, 1);
      const mrItem = mergeRequestsAssignedToMe[0];
      assert.strictEqual(mrItem.label, '!33824 · Web IDE - remove unused actions (mappings)');

      const mrContent = await dataProvider.getChildren(mrItem);
      assert.strictEqual(mrContent[0].label, 'Description');

      mrFiles = mrContent.slice(1);
    });

    it('should show the correct diff title', () => {
      const item = getItem('/README1.md');
      const [, , diffTitle] = getDiffArgs(item);
      assert.strictEqual(diffTitle, 'README1.md (!33824)');
    });

    it('should not show diff for images', () => {
      const item = getItem('/Screenshot.png');
      assert.strictEqual(item.command.command, PROGRAMMATIC_COMMANDS.NO_IMAGE_REVIEW);
    });

    describe('Api content provider', () => {
      let apiContentProvider;

      before(() => {
        apiContentProvider = new ApiContentProvider();
      });

      it('should fetch base content for a diff URI', async () => {
        const item = getItem('/src/test.js');
        const [baseUri] = getDiffArgs(item);
        const content = await apiContentProvider.provideTextDocumentContent(baseUri);
        assert.strictEqual(content, 'Old Version');
      });

      it('should fetch head content for a diff URI', async () => {
        const item = getItem('/src/test.js');
        const [, headUri] = getDiffArgs(item);
        const content = await apiContentProvider.provideTextDocumentContent(headUri);
        assert.strictEqual(content, 'New Version');
      });

      it('should show empty file when asked to fetch base content for added file', async () => {
        const item = getItem('/new_file.ts');
        const [baseUri] = getDiffArgs(item);
        const content = await apiContentProvider.provideTextDocumentContent(baseUri);
        assert.strictEqual(content, '');
      });

      it('should show empty file when asked to fetch head content for deleted file', async () => {
        const item = getItem('/.deleted.yml');
        const [, headUri] = getDiffArgs(item);
        const content = await apiContentProvider.provideTextDocumentContent(headUri);
        assert.strictEqual(content, '');
      });
    });
  });

  it('handles full custom query for MR', async () => {
    const customMergeRequests = await openCategory('Custom GitLab Query for MR');

    assert.strictEqual(customMergeRequests.length, 1);
    assert.strictEqual(customMergeRequests[0].label, '!33824 · Custom Query MR');
  });

  it('handles full custom query for issues', async () => {
    const customMergeRequests = await openCategory('Custom GitLab Query for issues');

    assert.strictEqual(customMergeRequests.length, 1);
    assert.strictEqual(customMergeRequests[0].label, '#219925 · Custom Query Issue');
  });
});
