const { parseGitRemote } = require('./git_remote_parser');

describe('git_remote_parser', () => {
  it.each([
    [
      'git@gitlab.com:fatihacet/gitlab-vscode-extension.git',
      ['ssh:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
    ],
    [
      'gitlab-ci@gitlab-mydomain.com:fatihacet/gitlab-vscode-extension.git',
      ['ssh:', 'gitlab-mydomain.com', 'fatihacet', 'gitlab-vscode-extension'],
    ],
    [
      'ssh://git@gitlab.com:fatihacet/gitlab-vscode-extension.git',
      ['ssh:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
    ],
    [
      'git://git@gitlab.com:fatihacet/gitlab-vscode-extension.git',
      ['git:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
    ],
    [
      'http://git@gitlab.com/fatihacet/gitlab-vscode-extension.git',
      ['http:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
    ],
    [
      'http://gitlab.com/fatihacet/gitlab-vscode-extension.git',
      ['http:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
    ],
    [
      'https://git@gitlab.com/fatihacet/gitlab-vscode-extension.git',
      ['https:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
    ],
    [
      'https://gitlab.com/fatihacet/gitlab-vscode-extension.git',
      ['https:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
    ],
    [
      'https://gitlab.com/fatihacet/gitlab-vscode-extension',
      ['https:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
    ],
    [
      'https://gitlab.company.com/fatihacet/gitlab-vscode-extension.git',
      ['https:', 'gitlab.company.com', 'fatihacet', 'gitlab-vscode-extension'],
    ],
    [
      'https://gitlab.company.com:8443/fatihacet/gitlab-vscode-extension.git',
      ['https:', 'gitlab.company.com:8443', 'fatihacet', 'gitlab-vscode-extension'],
    ],
  ])('should parse %s', (remote, parsed) => {
    expect(parseGitRemote('https://gitlab.com', remote)).toEqual(parsed);
  });

  // For more details see https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/11
  it('should support self managed GitLab on a custom path', () => {
    expect(
      parseGitRemote(
        'https://example.com/gitlab',
        'https://example.com/gitlab/fatihacet/gitlab-vscode-extension',
      ),
    ).toEqual(['https:', 'example.com', 'fatihacet', 'gitlab-vscode-extension']);
  });
});
