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
});
