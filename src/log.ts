import * as vscode from 'vscode';
import { USER_COMMANDS } from './command_names';
import { DetailedError, isDetailedError, prettyJson } from './errors/common';
import { HelpError } from './errors/help_error';
import { Help, HelpMessageSeverity } from './utils/help';

export const LOG_LEVEL = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export type LogLevel = typeof LOG_LEVEL[keyof typeof LOG_LEVEL];

type logFunction = (line: string) => void;

let globalLog: logFunction = console.error;

export const initializeLogging = (logLine: logFunction): void => {
  globalLog = logLine;
};

export const log = (line: string, level: LogLevel): void => {
  const prefix = `[${level}]: `;
  const padNextLines = (text: string) => text.replace(/\n/g, `\n${' '.repeat(prefix.length)}`);

  globalLog(`${prefix}${padNextLines(line)}`);
};

export const logError = (e: Error | DetailedError): void =>
  isDetailedError(e)
    ? log(prettyJson(e.details), LOG_LEVEL.ERROR)
    : log(`${e.message}\n${e.stack}`, LOG_LEVEL.ERROR);

export const handleError = (e: Error | DetailedError): { onlyForTesting: Promise<void> } => {
  logError(e);

  // This is probably the only place where we want to ignore a floating promise.
  // We don't want to block the app and wait for user click on the "Show Logs"
  // button or close the message However, for testing this method, we need to
  // keep the promise.
  if (HelpError.isHelpError(e)) {
    return { onlyForTesting: Help.showError(e, HelpMessageSeverity.Error) };
  }
  const showErrorMessage = async () => {
    const choice = await vscode.window.showErrorMessage(e.message, 'Show Logs');
    if (choice === 'Show Logs') {
      await vscode.commands.executeCommand(USER_COMMANDS.SHOW_OUTPUT);
    }
  };
  return { onlyForTesting: showErrorMessage() };
};
