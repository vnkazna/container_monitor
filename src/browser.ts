import * as vscode from 'vscode';
import { initializeLogging, log } from './log';
import { tokenService } from './services/token_service';
import { doNotAwait } from './utils/do_not_await';

export const activate = async (context: vscode.ExtensionContext): Promise<void> => {
  const outputChannel = vscode.window.createOutputChannel('GitLab Workflow');
  initializeLogging(line => outputChannel.appendLine(line));
  log('started');
  doNotAwait(vscode.window.showInformationMessage('Extension in the browser'));
  tokenService.init(context);
};
