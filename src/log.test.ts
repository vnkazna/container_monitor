import * as vscode from 'vscode';
import { IDetailedError } from './errors/common';
import { handleError, initializeLogging, log, logError, LOG_LEVEL } from './log';
import { USER_COMMANDS } from './command_names';
import { asMock } from './test_utils/as_mock';

describe('logging', () => {
  afterEach(() => {
    expect.hasAssertions();
  });

  let logFunction: jest.Mock;

  beforeEach(() => {
    logFunction = jest.fn();
    initializeLogging(logFunction);
  });

  const getLoggedMessage = () => asMock(logFunction).mock.calls[0][0];

  describe('log', () => {
    it('passes the argument to the handler', () => {
      const message = 'A very bad error occurred';
      log(message, LOG_LEVEL.INFO);
      expect(logFunction).toBeCalledTimes(1);
      expect(logFunction).toBeCalledWith(`[info]: ${message}`);
    });

    it.each(['error', 'warning', 'info'] as const)('it handles log level "%s"', logLevel => {
      log('message', logLevel);
      expect(logFunction).toBeCalledWith(`[${logLevel}]: message`);
    });

    it('indents multiline messages', () => {
      log('error happened\nand the next line\nexplains why', LOG_LEVEL.ERROR);
      expect(logFunction).toHaveBeenCalledWith(
        `[error]: error happened\n         and the next line\n         explains why`,
      );
    });
  });

  describe('logError', () => {
    describe('for normal errors', () => {
      it('passes the argument to the handler', () => {
        const message = 'A very bad error occurred';
        const error = {
          message,
          stack: 'stack',
        };
        logError(error as Error);
        expect(getLoggedMessage()).toMatch(/\[error\]: A very bad error occurred\s+stack/m);
      });
    });

    describe('for detailed errors', () => {
      it('passes the details to the handler', () => {
        const details = 'Could not fetch from GitLab: error 404';
        logError({
          details,
        } as IDetailedError);
        expect(logFunction).toBeCalledWith(`[error]: ${details}`);
      });
    });
  });

  describe('handleError', () => {
    const message = 'Uncaught TypeError: NetworkError when attempting to fetch resource.';
    const showErrorMessage = vscode.window.showErrorMessage as jest.Mock;

    it('passes the argument to the handler', () => {
      const error = new Error(message);

      handleError(error);

      expect(getLoggedMessage()).toContain(message);
    });

    it('prompts the user to show the logs', () => {
      handleError(new Error(message));

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
