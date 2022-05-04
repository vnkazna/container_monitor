import * as vscode from 'vscode';
import assert from 'assert';
import { AccountService } from './services/account_service';
import { gitExtensionWrapper } from './git/git_extension_wrapper';

const hasOpenRepositories = (): boolean => gitExtensionWrapper.gitRepositories.length > 0;
export class ExtensionState {
  private changeValidEmitter = new vscode.EventEmitter<void>();

  onDidChangeValid = this.changeValidEmitter.event;

  accountService?: AccountService;

  private lastValid = false;

  async init(accountService: AccountService): Promise<void> {
    this.accountService = accountService;
    this.lastValid = this.isValid();
    accountService.onDidChange(this.updateExtensionStatus, this);
    gitExtensionWrapper.onRepositoryCountChanged(this.updateExtensionStatus, this);
    await this.updateExtensionStatus();
  }

  private hasAnyTokens(): boolean {
    assert(this.accountService, 'ExtensionState has not been initialized.');
    return this.accountService.getInstanceUrls().length > 0;
  }

  isValid(): boolean {
    return this.hasAnyTokens() && hasOpenRepositories();
  }

  async updateExtensionStatus(): Promise<void> {
    await vscode.commands.executeCommand('setContext', 'gitlab:noToken', !this.hasAnyTokens());
    await vscode.commands.executeCommand(
      'setContext',
      'gitlab:noRepository',
      !hasOpenRepositories(),
    );
    await vscode.commands.executeCommand('setContext', 'gitlab:validState', this.isValid());
    if (this.lastValid !== this.isValid()) {
      this.lastValid = this.isValid();
      this.changeValidEmitter.fire();
    }
  }
}

export const extensionState = new ExtensionState();
