# Writing tests

This document provides technical details about our automated tests. Please see [Testing Strategy](testing-strategy.md) document to understand why are we testing this way.

## Technology choice

- **Unit Tests**: TypeScript and [Jest](https://jestjs.io/)[^1]
- **Integration tests**: JavaScript and [`mocha`](https://mochajs.org/) as a test runner, [`assert`](https://nodejs.org/docs/latest-v12.x/api/assert.html) for assertions, and [`vscode-test`](https://code.visualstudio.com/api/working-with-extensions/testing-extension#the-test-script) to run integration tests in VS Code instance

_We choose JavaScript for integration tests because `@types/jest` and `@types/mocha` are not compatible and often cause conflicts. The integration tests are written against much more stable VS Code Extension API and so some of the TS benefits are not as pronounced._

## Unit tests `npm run test-unit`

Place unit tests for a module in the same folder as the production code. The name of the test file has `.test.ts` suffix. If the code under test depends on the `vscode` module, you must add the `vscode` methods and objects to the [`vscode.js`](src/__mocks__/vscode.js) [manual Jest mock](https://jestjs.io/docs/en/manual-mocks#mocking-node-modules).

- `src/git/git_remote_parser.ts` - production file
- `src/git/git_remote_parser.test.ts` - test file

You can debug unit tests by running the "Unit Tests" [Launch configuration](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations).

## Integration tests `npm run test-integration`

Integration tests mock the GitLab API using the [`msw`](https://mswjs.io/docs/) module. All API calls made by the extension are intercepted by `msw` and handled by [`mock_server.js`](../test/integration/test_infrastructure/mock_server.js).

A temporary workspace for integration tests is created once before running the test suite by `test/create_tmp_workspace.ts`. In this helper script, we use [`simple-git`](https://github.com/steveukx/git-js) module to initialize git repository.

### Debugging integration tests

For debugging the integration tests, we first need to create a test workspace. We can do that by running `npm run create-test-workspace` script. This script generates a new workspace and inserts its path into `.vscode/launch.json`.

Then we can debug the by running the "Integration Tests" [Launch configuration](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations).

### Create a new integration test

When creating a new integration test, you need to know how the tested functionality interacts with the rest of the VS Code, filesystem and GitLab API. Please see the [integration strategy](testing-strategy.md#extension-under-integration-tests) to understand the test boundaries.

#### Prepare VS Code dependency

We are now not mocking any part of VS Code. You should be able to set the extension up by calling the [VS Code extension API](https://code.visualstudio.com/api). You might be able to use some of our services directly to set up the extension. Example is setting up the test token by running `accountService.setToken('https://gitlab.com', 'abcd-secret');`

#### Prepare Filesystem dependency

If you need an additional `git` configuration for your testing, you can set it up either in `test/create_tmp_workspace.ts` (if all tests need it). Or you can use `simple-git` directly in your test set up code (don't forget to reset the config after your test to prevent side effects).

You can find example of setting the Git repository in a test in [`insert_snippet.test.js`](../test/integration/insert_snippet.test.js):

```js
it('throws an error when it cannot find GitLab project', async () => {
  const git = simpleGit(getRepositoryRoot());
  await git.removeRemote(REMOTE.NAME);
  await git.addRemote(REMOTE.NAME, 'git@test.gitlab.com:gitlab-org/nonexistent.git');
  await assert.rejects(insertSnippet(), /Project gitlab-org\/nonexistent was not found./);
});
```

#### Prepare GitLab API dependency

We use [`msw`](https://mswjs.io/docs/) to intercept any requests and return prepared mock responses. When you want to add a new mocked response, do it in the following steps:

1. Use a debugger to inspect what request you send out from `gitlab_service.ts`.
1. Run your tests and note down the logged request that the functionality under test makes.
1. Mock the request in the `before` or `beforeEach` method in your test.

[^1]: https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/87
