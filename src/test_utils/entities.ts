import { CustomQueryType } from '../gitlab/custom_query_type';

export const issuable: RestIssuable = {
  id: 1,
  iid: 1000,
  title: 'Issuable Title',
  project_id: 9999,
  web_url: 'https://gitlab.example.com/group/project/issues/1',
  author: {
    avatar_url:
      'https://secure.gravatar.com/avatar/6042a9152ada74d9fb6a0cdce895337e?s=80&d=identicon',
    name: 'Tomas Vik',
  },
};

export const diffFile: RestDiffFile = {
  old_path: 'old_file.js',
  new_path: 'new_file.js',
  new_file: false,
  deleted_file: false,
  renamed_file: true,
};

export const mrVersion: RestMrVersion = {
  base_commit_sha: 'aaaaaaaa',
  head_commit_sha: 'bbbbbbbb',
  diffs: [diffFile],
};

export const project: VsProject = {
  label: 'Project label',
  uri: '/home/johndoe/workspace/project',
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
