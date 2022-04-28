import * as vscode from 'vscode';
import { ExtensionState } from './extension_state';
import { accountService } from './services/account_service';
import { gitExtensionWrapper } from './git/git_extension_wrapper';

describe('extension_state', () => {
  let extensionState: ExtensionState;
  let mockedInstancesWithTokens: string[];
  let mockedRepositories: any[];

  beforeEach(() => {
    mockedInstancesWithTokens = [];
    mockedRepositories = [];
    accountService.getInstanceUrls = () => mockedInstancesWithTokens;
    jest
      .spyOn(gitExtensionWrapper, 'gitRepositories', 'get')
      .mockImplementation(() => mockedRepositories);
    extensionState = new ExtensionState();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each`
    scenario                             | instancesWithTokens       | repositories        | validState | noToken  | noRepository
    ${'is invalid'}                      | ${[]}                     | ${[]}               | ${false}   | ${true}  | ${true}
    ${'is invalid without tokens'}       | ${[]}                     | ${['repository']}   | ${false}   | ${true}  | ${false}
    ${'is invalid without repositories'} | ${['https://gitlab.com']} | ${[]}               | ${false}   | ${false} | ${true}
    ${'is valid'}                        | ${['https://gitlab.com']} | ${[['repository']]} | ${true}    | ${false} | ${false}
  `(
    '$scenario',
    async ({ instancesWithTokens, repositories, validState, noToken, noRepository }) => {
      mockedInstancesWithTokens = instancesWithTokens;
      mockedRepositories = repositories;
      await extensionState.init(accountService);

      const { executeCommand } = vscode.commands;
      expect(executeCommand).toBeCalledWith('setContext', 'gitlab:validState', validState);
      expect(executeCommand).toBeCalledWith('setContext', 'gitlab:noAccount', noToken);
      expect(executeCommand).toBeCalledWith('setContext', 'gitlab:noRepository', noRepository);
    },
  );

  it('fires event when valid state changes', async () => {
    await extensionState.init(accountService);
    const listener = jest.fn();
    extensionState.onDidChangeValid(listener);
    // setting tokens and repositories makes extension state valid
    mockedInstancesWithTokens = ['http://new-instance-url'];
    mockedRepositories = ['repository'];

    await extensionState.updateExtensionStatus();

    expect(listener).toHaveBeenCalled();
  });
});
