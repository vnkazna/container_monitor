import * as vscode from 'vscode';
import { USER_COMMANDS } from './command_names';
import { IDetailedError } from './errors/common';

function isDetailedError(object: any): object is IDetailedError {
  return Boolean(object.details);
}

type logFunction = (line: string) => void;

let globalLog: logFunction;

export const initializeLogging = (logLine: logFunction): void => {
  globalLog = logLine;
};

export const log = (line: string): void => globalLog(line);

export const logError = (e: Error | IDetailedError): void =>
  isDetailedError(e) ? globalLog(e.details) : globalLog(`${e.message}\n${e.stack}`);

export const handleError = async (e: Error | IDetailedError): Promise<void> => {
  logError(e);
  const choice = await vscode.window.showErrorMessage(e.message, 'Show logs');
  if (choice === 'Show logs') {
    await vscode.commands.executeCommand(USER_COMMANDS.SHOW_OUTPUT);
  }
};
