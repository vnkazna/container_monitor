import * as vscode from 'vscode';
import { USER_COMMANDS } from './command_names';
import { IDetailedError } from './errors/common';

function isDetailedError(object: any): object is IDetailedError {
  return Boolean(object.details);
}

type logFunction = (line: string) => void;

let globalLog: logFunction = console.error;

export const initializeLogging = (logLine: logFunction): void => {
  globalLog = logLine;
};

export const log = (line: string): void => globalLog(line);

export const logError = (e: Error | IDetailedError): void =>
  isDetailedError(e) ? globalLog(e.details) : globalLog(`${e.message}\n${e.stack}`);

export const handleError = (e: Error | IDetailedError): { onlyForTesting: Promise<void> } => {
  logError(e);
  const showErrorMessage = async () => {
    const choice = await vscode.window.showErrorMessage(e.message, 'Show Logs');
    if (choice === 'Show Logs') {
      await vscode.commands.executeCommand(USER_COMMANDS.SHOW_OUTPUT);
    }
  };
  // This is probably the only place where we want to ignore a floating promise.
  // We don't want to block the app and wait for user click on the "Show Logs" button or close the message
  // However, for testing this method, we need to keep the promise
  return { onlyForTesting: showErrorMessage() };
};
