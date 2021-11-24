import * as vscode from 'vscode';
import * as tokenInput from './token_input';
import { USER_COMMANDS } from './command_names';
import { initializeLogging, log } from './log';
import { tokenService } from './services/token_service';
import { doNotAwait } from './utils/do_not_await';
import { wrapWithCatch } from './utils/wrap_with_catch';
import { REMOTE_URI_SCHEME } from './constants';
import { GitLabRemoteFileSystem } from './remotefs/gitlab_remote_file_system';
import { openRepository } from './commands/open_repository';

const registerCommands = (context: vscode.ExtensionContext) => {
  const commands = {
    // [USER_COMMANDS.SHOW_ISSUES_ASSIGNED_TO_ME]: runWithValidProject(openers.showIssues),
    [USER_COMMANDS.SET_TOKEN]: tokenInput.showInput,
    [USER_COMMANDS.REMOVE_TOKEN]: tokenInput.removeTokenPicker,
    [USER_COMMANDS.OPEN_REPOSITORY]: openRepository,
  };

  Object.keys(commands).forEach(cmd => {
    context.subscriptions.push(
      vscode.commands.registerCommand(cmd, wrapWithCatch(commands[cmd] as any)),
    );
  });
};

export const activate = async (context: vscode.ExtensionContext): Promise<void> => {
  const outputChannel = vscode.window.createOutputChannel('GitLab Workflow');
  initializeLogging(line => outputChannel.appendLine(line));
  log('started');
  doNotAwait(vscode.window.showInformationMessage('Extension in the browser'));
  tokenService.init(context);
  registerCommands(context);
  vscode.workspace.registerFileSystemProvider(
    REMOTE_URI_SCHEME,
    new GitLabRemoteFileSystem(),
    GitLabRemoteFileSystem.OPTIONS,
  );
};
