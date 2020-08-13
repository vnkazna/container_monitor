# Writing tests

This document provides technical details about our automated tests. Please see [Testing Strategy](testing-strategy.md) document to understand why are we testing this way.

## Technology choice

We are using [Jest](https://jestjs.io/) for our unit tests[^1]. For integration tests, we use [`mocha`](https://mochajs.org/) as a test runner, [`assert`](https://nodejs.org/docs/latest-v12.x/api/assert.html) for assertions, and [`vscode-test`](https://code.visualstudio.com/api/working-with-extensions/testing-extension#the-test-script) to run integration tests in VS Code instance.

## Unit tests `npm run test-unit`

Modules that **don't depend on `vscode` module** can be unit tested. Unit tests for a module are placed in the same folder. The name of the test file has `.test.js` suffix.

- `src/git/git_remote_parser.js` - production file
- `src/git/git_remote_parser.test.js` - test file

The tests can be debugged by running the "Unit Tests" [Launch configuration].

## Integration tests `npm run test-integration`

Integration tests mocking the GitLab API using the [`msw`](https://mswjs.io/docs/) module. All API calls made by the extension are intercepted by `msw` and handled by `test/integration/mock_server.js`.

A temporary workspace for integration tests is created once before running the test suite by `test/create_tmp_workspace.ts`. In this helper script, we use [`simple-git`](https://github.com/steveukx/git-js) module to initialize git repository.

### Create a new integration test

When creating a new integration test, you need to know how the tested functionality interacts with the rest of the VS Code, filesystem and GitLab API. Please see the [integration strategy](testing-strategy.md#extension-under-integration-tests) to understand the test boundaries.

#### Prepare VS Code dependency

We are now not mocking any part of VS Code. You should be able to set the extension up by calling the [VS Code extension API](https://code.visualstudio.com/api). You might be able to use some of our services directly to set up the extension. Example is setting up the test token by running ```tokenService.setToken('https://gitlab.com', 'abcd-secret');```

#### Prepare Filesystem dependency

If you need additional `git` configuration for your testing, you can set it up either in `test/create_tmp_workspace.ts` (if all tests need it). Or you can use `simple-git` directly in your test set up code (don't forget to reset the config after your test to prevent side effects).

#### Prepare GitLab API dependency

We use [`msw`](https://mswjs.io/docs/) to intercept any requests and return prepared mock responses. When you want to add a new mocked response, do it in the following steps:

1. add temporary `console.log(config)` just before we make the API call (`await request(config)`) in `gitlab_service.js`
1. Run your tests and note down the logged request that the functionality under test makes
1. Mock the request in `mock_server.js`

### Debugging integration tests

For debugging of the integration tests, we first need to create a test workspace (the `npm run test-integration` task doesn't need this step because it does it automatically). We can do that by running ```npm run create-test-workspace``` script. Then we copy the output to `.vscode/launch.json` instead of the placeholder in the "Integration Tests" launch configuration arguments.

Then we can debug the by running the "Integration Tests" [Launch configuration].

[Launch configuration]: https://code.visualstudio.com/docs/editor/debugging#_launch-configurations

[^1]: https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/87
