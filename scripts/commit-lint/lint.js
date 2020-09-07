const axios = require('axios').default;
const read = require('@commitlint/read').default;
const lint = require('@commitlint/lint').default;
const format = require('@commitlint/format').default;
const config = require('@commitlint/config-conventional');

const maximumLineLength = 72;

// You can test the script by setting these environment variables
const {
  CI_MERGE_REQUEST_PROJECT_ID, // 5261717
  CI_MERGE_REQUEST_IID,
  CI_COMMIT_SHA,
  CI_MERGE_REQUEST_TARGET_BRANCH_NAME, // usually main
} = process.env;

const urlSemanticRelease =
  'https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/docs/commits.md';

const customRules = {
  'header-max-length': [2, 'always', maximumLineLength],
  'body-leading-blank': [2, 'always'],
  'body-max-length': [1, 'always', maximumLineLength],
  'footer-max-length': [1, 'always', maximumLineLength],
};

async function getMr() {
  const result = await axios.get(
    `https://gitlab.com/api/v4/projects/${CI_MERGE_REQUEST_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}`,
  );
  const { title, squash } = result.data;
  return {
    title,
    squash,
  };
}

async function getCommitsInMr() {
  const targetBranch = CI_MERGE_REQUEST_TARGET_BRANCH_NAME;
  const sourceCommit = CI_COMMIT_SHA;
  const messages = await read({ from: targetBranch, to: sourceCommit });
  return messages;
}

async function isConventional(message) {
  return lint(message, { ...config.rules, ...customRules });
}

const isMultiline = commit => {
  const [, empty, body] = commit.split('\n');
  return empty === '' && Boolean(body);
};

async function lintMr() {
  const mr = await getMr();
  const commits = await getCommitsInMr();

  if (!mr.squash) {
    console.log(
      'INFO: MR is not set to squash, every commit message needs to conform to conventional commit standard.\n',
    );
    return Promise.all(commits.map(isConventional));
  }

  const firstMultiline = commits.reverse().find(isMultiline); // first chronologically means last in the commits list
  if (firstMultiline) {
    console.log(
      'INFO: MR is set to squash, GitLab is going to used the first multiline MR as commit message.\n',
    );
    return isConventional(firstMultiline).then(Array.of);
  }

  console.log(
    'INFO: MR is set to squash, there is no multiline commit and so GitLab is going to use the MR title.\n' +
      "INFO: If the MR title isn't correct, you can fix it and rerun this CI Job.\n",
  );
  return isConventional(mr.title).then(Array.of);
}

async function run() {
  const results = await lintMr();

  console.error(format({ results }, { helpUrl: urlSemanticRelease }));

  const numOfErrors = results.reduce((acc, result) => acc + result.errors.length, 0);
  if (numOfErrors !== 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
