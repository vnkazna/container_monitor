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
  'https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/docs/developer/commits.md';

const customRules = {
  'header-max-length': [2, 'always', maximumLineLength],
  'body-leading-blank': [2, 'always'],
  'footer-leading-blank': [2, 'always'],
  'subject-case': [0],
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
  return lint(message, { ...config.rules, ...customRules }, { defaultIgnores: false });
}

async function lintMr() {
  const mr = await getMr();
  const commits = await getCommitsInMr();

  if (!mr.squash || commits.length === 1) {
    console.log(
      'INFO: MR is not set to squash and/or there is only one commit. Every commit message needs to conform to conventional commit standard.\n',
    );
    return Promise.all(commits.map(isConventional));
  }

  console.log(
    'INFO: MR is set to squash. GitLab is going to use the MR title.\n' +
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
