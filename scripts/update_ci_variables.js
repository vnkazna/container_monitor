const fs = require('fs');
const path = require('path');
const fetch = require('cross-fetch');

const VARIABLE_JSON_PATH = path.join(__dirname, '../src/completion/ci_variables.json');

async function fetchDocumentation() {
  return fetch(
    'https://gitlab.com/gitlab-org/gitlab/-/raw/master/doc/ci/variables/predefined_variables.md',
  ).then(res => res.text());
}

function parseDocumentation(variableMarkdown) {
  const lines = variableMarkdown.split('\n');
  const tableStartLine = lines.findIndex(l => l.startsWith('| Variable   '));
  const tableLines = lines.slice(tableStartLine + 2);
  const variables = tableLines.map(l => {
    const [, nameSegment, , , descriptionSegment] = l.split('|');

    if (!nameSegment) return undefined;

    return {
      name: nameSegment.trim().replace(/`/g, ''),
      description: descriptionSegment.trim(),
    };
  });

  const json = JSON.stringify(variables.filter(Boolean), undefined, 2);
  return `${json}\n`;
}

function loadExistingVariablesJson() {
  return fs.readFileSync(VARIABLE_JSON_PATH).toString();
}

function writeVariablesJson(json) {
  return fs.writeFileSync(VARIABLE_JSON_PATH, `${json}\n`);
}

async function run() {
  const onlineDoc = await fetchDocumentation();
  const onlineVariablesJson = parseDocumentation(onlineDoc);
  const existingVariablesJson = loadExistingVariablesJson();

  if (process.env.CI && onlineVariablesJson !== existingVariablesJson) {
    console.error(
      '❌ ./src/utils/ci_variables.json has changes, please execute `npm run update-ci-variables` to fix this.',
    );
    process.exit(1);
  }
  if (onlineVariablesJson !== existingVariablesJson) {
    writeVariablesJson(onlineVariablesJson);
    console.log('✅ ./src/utils/ci_variables.json was updated successfully.');
  } else {
    console.log('ℹ️ No changes to ./src/utils/ci_variables.json.');
  }
}

run();