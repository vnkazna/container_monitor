import * as vscode from 'vscode';
import { ExtensionState } from './extension_state';
import { tokenService } from './services/token_service';
import { gitExtensionWrapper } from './git/git_extension_wrapper';

describe('extension_state', () => {
  let extensionState: ExtensionState;
  let mockedInstancesWithTokens: string[];
  let mockedRepositories: any[];

  beforeEach(() => {
    mockedInstancesWithTokens = [];
    mockedRepositories = [];
    tokenService.getInstanceUrls = () => mockedInstancesWithTokens;
    jest
      .spyOn(gitExtensionWrapper, 'repositories', 'get')
      .mockImplementation(() => mockedRepositories);
    extensionState = new ExtensionState();
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
      await extensionState.init(tokenService);

      const { executeCommand } = vscode.commands;
      expect(executeCommand).toBeCalledWith('setContext', 'gitlab:validState', validState);
      expect(executeCommand).toBeCalledWith('setContext', 'gitlab:noToken', noToken);
      expect(executeCommand).toBeCalledWith('setContext', 'gitlab:noRepository', noRepository);
    },
  );

  it('fires event when valid state changes', async () => {
    await extensionState.init(tokenService);
    const listener = jest.fn();
    extensionState.onDidChangeValid(listener);
    // setting tokens and repositories makes extension state valid
    mockedInstancesWithTokens = ['http://new-instance-url'];
    mockedRepositories = ['repository'];

    await extensionState.updateExtensionStatus();

    expect(listener).toHaveBeenCalled();
  });
});
