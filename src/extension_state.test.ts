import * as vscode from 'vscode';
import { ExtensionState } from './extension_state';
import { accountService } from './services/account_service';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { testAccount } from './test_utils/test_account';
import { Account } from './services/account';

describe('extension_state', () => {
  let extensionState: ExtensionState;
  let mockedAccounts: Account[];
  let mockedRepositories: any[];

  beforeEach(() => {
    mockedAccounts = [];
    mockedRepositories = [];
    accountService.getAllAccounts = () => mockedAccounts;
    jest
      .spyOn(gitExtensionWrapper, 'gitRepositories', 'get')
      .mockImplementation(() => mockedRepositories);
    extensionState = new ExtensionState();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it.each`
    scenario                             | accounts           | repositories        | validState | noToken  | noRepository
    ${'is invalid'}                      | ${[]}              | ${[]}               | ${false}   | ${true}  | ${true}
    ${'is invalid without tokens'}       | ${[]}              | ${['repository']}   | ${false}   | ${true}  | ${false}
    ${'is invalid without repositories'} | ${[testAccount()]} | ${[]}               | ${false}   | ${false} | ${true}
    ${'is valid'}                        | ${[testAccount]}   | ${[['repository']]} | ${true}    | ${false} | ${false}
  `('$scenario', async ({ accounts, repositories, validState, noToken, noRepository }) => {
    mockedAccounts = accounts;
    mockedRepositories = repositories;
    await extensionState.init(accountService);

    const { executeCommand } = vscode.commands;
    expect(executeCommand).toBeCalledWith('setContext', 'gitlab:validState', validState);
    expect(executeCommand).toBeCalledWith('setContext', 'gitlab:noAccount', noToken);
    expect(executeCommand).toBeCalledWith('setContext', 'gitlab:noRepository', noRepository);
  });

  it('fires event when valid state changes', async () => {
    await extensionState.init(accountService);
    const listener = jest.fn();
    extensionState.onDidChangeValid(listener);
    // setting tokens and repositories makes extension state valid
    mockedAccounts = [testAccount()];
    mockedRepositories = ['repository'];

    await extensionState.updateExtensionStatus();

    expect(listener).toHaveBeenCalled();
  });
});
