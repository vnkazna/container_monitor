const assert = require('assert');

const { parseGitRemote } = require('./git_remote_parser');

const parameters = [
  {
    argument: 'git@gitlab.com:fatihacet/gitlab-vscode-extension.git',
    result: ['ssh:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
  },
  {
    argument: 'gitlab-ci@gitlab-mydomain.com:fatihacet/gitlab-vscode-extension.git',
    result: ['ssh:', 'gitlab-mydomain.com', 'fatihacet', 'gitlab-vscode-extension'],
  },
  {
    argument: 'ssh://git@gitlab.com:fatihacet/gitlab-vscode-extension.git',
    result: ['ssh:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
  },
  {
    argument: 'git://git@gitlab.com:fatihacet/gitlab-vscode-extension.git',
    result: ['git:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
  },
  {
    argument: 'http://git@gitlab.com/fatihacet/gitlab-vscode-extension.git',
    result: ['http:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
  },
  {
    argument: 'http://gitlab.com/fatihacet/gitlab-vscode-extension.git',
    result: ['http:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
  },
  {
    argument: 'https://git@gitlab.com/fatihacet/gitlab-vscode-extension.git',
    result: ['https:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
  },
  {
    argument: 'https://gitlab.com/fatihacet/gitlab-vscode-extension.git',
    result: ['https:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
  },
  {
    argument: 'https://gitlab.com/fatihacet/gitlab-vscode-extension',
    result: ['https:', 'gitlab.com', 'fatihacet', 'gitlab-vscode-extension'],
  },
  {
    argument: 'https://gitlab.company.com/fatihacet/gitlab-vscode-extension.git',
    result: ['https:', 'gitlab.company.com', 'fatihacet', 'gitlab-vscode-extension'],
  },
  {
    argument: 'https://gitlab.company.com:8443/fatihacet/gitlab-vscode-extension.git',
    result: ['https:', 'gitlab.company.com:8443', 'fatihacet', 'gitlab-vscode-extension'],
  },
];

describe('git_remote_parser', () => {
  parameters.forEach(p => {
    it(`should parse ${p.argument}`, () => {
      assert.deepEqual(parseGitRemote('https://gitlab.com', p.argument), p.result);
    });
  });
});
