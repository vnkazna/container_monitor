const path = require('path');
const Mocha = require('mocha');
// glob is available in the VS Code runtime
// eslint-disable-next-line import/no-extraneous-dependencies
const glob = require('glob');
const { initializeTestEnvironment } = require('./test_infrastructure/initialize_test_environment');

const getAllTestFiles = testsRoot =>
  new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) reject(err);
      resolve(files);
    });
  });

async function run(testsRoot) {
  // Create the mocha test
  const mocha = new Mocha();
  mocha.timeout(2000);
  mocha.color(true);
  const files = await getAllTestFiles(testsRoot);

  // Add files to the test suite
  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

  // Initialize VS Code environment for integration tests
  initializeTestEnvironment();

  // Run the mocha test
  await new Promise((res, rej) =>
    mocha.run(failures => {
      if (failures) {
        rej(failures);
      } else {
        res();
      }
    }),
  );
}

module.exports = { run };
