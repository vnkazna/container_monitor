import * as vscode from 'vscode';
import { ExtensionState } from './extension_state';
import { tokenService } from './services/token_service';

describe('extension_state', () => {
  let extensionState: ExtensionState;
  let tokens: string[];

  beforeEach(() => {
    tokenService.getInstanceUrls = () => tokens;
    extensionState = new ExtensionState();
  });

  describe('with no tokens', () => {
    beforeEach(async () => {
      tokens = [];
      await extensionState.init(tokenService);
    });

    it('state is not valid', () => {
      expect(extensionState.isValid()).toBe(false);
    });

    it.each`
      context                | value
      ${'gitlab:noToken'}    | ${true}
      ${'gitlab:validState'} | ${false}
    `('sets global context $context to $value', ({ context, value }) => {
      expect(vscode.commands.executeCommand).toBeCalledWith('setContext', context, value);
    });

    it('fires event when valid state changes', async () => {
      const listener = jest.fn();
      extensionState.onDidChangeValid(listener);
      tokens = ['http://new-instance-url']; // setting token makes extension state valid

      await extensionState.updateExtensionStatus();

      expect(listener).toHaveBeenCalled();
    });
  });

  describe('with tokens', () => {
    beforeEach(async () => {
      tokens = ['http://new-instance-url'];
      await extensionState.init(tokenService);
    });

    it('state is valid', () => {
      expect(extensionState.isValid()).toBe(true);
    });

    it.each`
      context                | value
      ${'gitlab:noToken'}    | ${false}
      ${'gitlab:validState'} | ${true}
    `('sets global context $context to $value', ({ context, value }) => {
      expect(vscode.commands.executeCommand).toBeCalledWith('setContext', context, value);
    });

    it('fires event when valid state changes', async () => {
      const listener = jest.fn();
      extensionState.onDidChangeValid(listener);
      tokens = []; // unsetting tokens makes extension state invalid

      await extensionState.updateExtensionStatus();

      expect(listener).toHaveBeenCalled();
    });
  });
});
