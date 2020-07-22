const path = require('path');
const Mocha = require('mocha');
// glob is available in the VS Code runtime
// eslint-disable-next-line import/no-extraneous-dependencies
const glob = require('glob');

const getAllTestFiles = testsRoot =>
  new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) reject(err);
      resolve(files);
    });
  });

// This function is a public interface that VS Code uses to run the tests
// eslint-disable-next-line import/prefer-default-export
async function run(testsRoot) {
  // Create the mocha test
  const mocha = new Mocha();
  mocha.timeout(2000);
  mocha.color(true);
  const files = await getAllTestFiles(testsRoot);

  // Add files to the test suite
  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

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
