import * as vscode from 'vscode';
import { IDetailedError } from './errors/common';
import { handleError, initializeLogging, log, logError } from './log';
import { USER_COMMANDS } from './command_names';

describe('logging', () => {
  afterEach(() => {
    expect.hasAssertions();
  });

  let logFunction: jest.Mock;

  beforeEach(() => {
    logFunction = jest.fn();
    initializeLogging(logFunction);
  });

  describe('log', () => {
    it('passes the argument to the handler', () => {
      const message = 'A very bad error occured';
      log(message);
      expect(logFunction).toBeCalledTimes(1);
      expect(logFunction).toBeCalledWith(message);
    });
  });

  describe('logError', () => {
    describe('for normal errors', () => {
      it('passes the argument to the handler', () => {
        const message = 'A very bad error occured';
        const error = new Error(message);
        logError(error);
        expect(logFunction).toBeCalledTimes(1);
        expect(logFunction).toBeCalledWith(`${message}\n${error.stack}`);
      });
    });

    describe('for detailed errors', () => {
      it('passes the details to the handler', () => {
        const details = 'Could not fetch from GitLab: error 404';
        logError({
          details,
        } as IDetailedError);
        expect(logFunction).toBeCalledTimes(1);
        expect(logFunction).toBeCalledWith(details);
      });
    });
  });

  describe('handleError', () => {
    const message = 'Uncaught TypeError: NetworkError when attempting to fetch resource.';
    const showErrorMessage = vscode.window.showErrorMessage as jest.Mock;

    it('passes the argument to the handler', () => {
      const error = new Error(message);

      handleError(error);

      expect(logFunction).toBeCalledTimes(1);
      expect(logFunction).toBeCalledWith(`${message}\n${error.stack}`);
    });

    it('prompts the user to show the logs', () => {
      handleError(new Error(message));

      expect(showErrorMessage).toBeCalledTimes(1);
      expect(showErrorMessage).toBeCalledWith(message, 'Show Logs');
    });

    it('shows the logs when the user confirms the prompt', async () => {
      const executeCommand = vscode.commands.executeCommand as jest.Mock;
      showErrorMessage.mockResolvedValue('Show Logs');

      await handleError(new Error(message)).onlyForTesting;

      expect(executeCommand).toBeCalledWith(USER_COMMANDS.SHOW_OUTPUT);
    });
  });
});
