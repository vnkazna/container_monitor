import { GitRemote, GitRepository } from '../git/new_git';
import { CustomQueryType } from '../gitlab/custom_query_type';
import { GitLabProject } from '../gitlab/gitlab_project';
import { GqlProject } from '../gitlab/graphql/shared';
import { ProjectInRepository } from '../gitlab/new_project';
import { ReviewParams as ReviewUriParams } from '../review/review_uri';
import { Account, makeAccountId } from '../services/account';
import { createFakeRepository } from './fake_git_extension';

export const issue: RestIssuable = {
  id: 1,
  iid: 1000,
  title: 'Issuable Title',
  project_id: 9999,
  web_url: 'https://gitlab.example.com/group/project/issues/1000',
  author: {
    avatar_url:
      'https://secure.gravatar.com/avatar/6042a9152ada74d9fb6a0cdce895337e?s=80&d=identicon',
    name: 'Tomas Vik',
  },
  references: {
    full: 'gitlab-org/gitlab#1000',
  },
  severity: 'severityLevel1',
  name: 'Issuable Name',
};

export const mr: RestMr = {
  ...issue,
  id: 2,
  iid: 2000,
  web_url: 'https://gitlab.example.com/group/project/merge_requests/2000',
  references: {
    full: 'gitlab-org/gitlab!2000',
  },
  sha: '69ad609e8891b8aa3db85a35cd2c5747705bd76a',
  source_project_id: 9999,
  target_project_id: 9999,
  source_branch: 'feature-a',
};

export const diffFile: RestDiffFile = {
  old_path: 'old_file.js',
  new_path: 'new_file.js',
  new_file: false,
  deleted_file: false,
  renamed_file: true,
  diff: '@@ -0,0 +1,7 @@\n+new file 2\n+\n+12\n+34\n+56\n+\n+,,,\n',
};

export const mrVersion: RestMrVersion = {
  id: 3,
  base_commit_sha: 'aaaaaaaa',
  head_commit_sha: 'bbbbbbbb',
  start_commit_sha: 'cccccccc',
  diffs: [diffFile],
};

export const customQuery = {
  name: 'Query name',
  type: CustomQueryType.ISSUE,
  maxResults: 10,
  scope: 'all',
  state: 'closed',
  wip: 'no',
  confidential: false,
  excludeSearchIn: 'all',
  orderBy: 'created_at',
  sort: 'desc',
  searchIn: 'all',
  noItemText: 'No item',
};

export const pipeline: RestPipeline = {
  status: 'success',
  updated_at: '2021-02-12T12:06:17Z',
  id: 123456,
  project_id: 567890,
  web_url: 'https://example.com/foo/bar/pipelines/46',
};

export const job: RestJob = {
  id: 1,
  name: 'Unit tests',
  status: 'success',
  stage: 'test',
  created_at: '2021-07-19T11:44:54.928Z',
  started_at: '2021-07-19T11:44:54.928Z',
  finished_at: '2021-07-19T11:44:54.928Z',
  allow_failure: false,
  web_url: 'https://example.com/foo/bar/jobs/68',
};

export const gqlProject: GqlProject = {
  id: 'gid://gitlab/Project/5261717',
  name: 'gitlab-vscode-extension',
  description: '',
  httpUrlToRepo: 'https://gitlab.com/gitlab-org/gitlab-vscode-extension.git',
  sshUrlToRepo: 'git@gitlab.com:gitlab-org/gitlab-vscode-extension.git',
  fullPath: 'gitlab-org/gitlab-vscode-extension',
  webUrl: 'https://gitlab.com/gitlab-org/gitlab-vscode-extension',
  group: {
    id: 'gid://gitlab/Group/9970',
  },
  wikiEnabled: false,
};

export const reviewUriParams: ReviewUriParams = {
  mrId: mr.id,
  projectId: mr.project_id,
  repositoryRoot: '/',
  path: 'new_path.js',
  commit: mr.sha,
};

export const project = new GitLabProject(gqlProject);

export const createProject = (namespaceWithPath: string) =>
  new GitLabProject({
    ...gqlProject,
    fullPath: namespaceWithPath,
    name: namespaceWithPath.replace('/', '-'),
  });

export const createAccount = (
  instanceUrl = 'https://gitlab.com',
  userId = 1,
  token = 'abc',
): Account => ({
  id: makeAccountId(instanceUrl, userId),
  username: `user${userId}`,
  instanceUrl,
  token,
  type: 'token',
});

export const gitRepository = {
  rootFsPath: '/path/to/repo',
  rawRepository: createFakeRepository(),
} as GitRepository;

export const projectInRepository: ProjectInRepository = {
  project,
  pointer: {
    repository: gitRepository,
    remote: { name: 'name' } as GitRemote,
    urlEntry: { type: 'both', url: 'git@gitlab.com:gitlab-org/gitlab-vscode-extension' },
  },
  account: createAccount(),
};

export const user: RestUser = {
  email: 'test@user.com',
  id: 123,
  state: 'active',
  username: 'test-user',
};
