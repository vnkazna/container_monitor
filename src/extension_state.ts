import * as vscode from 'vscode';
import assert from 'assert';
import { TokenService } from './services/token_service';
import { gitExtensionWrapper } from './git/git_extension_wrapper';

const hasOpenRepositories = (): boolean => gitExtensionWrapper.repositories.length > 0;
export class ExtensionState {
  private changeValidEmitter = new vscode.EventEmitter<void>();

  onDidChangeValid = this.changeValidEmitter.event;

  tokenService?: TokenService;

  private lastValid = false;

  async init(tokenService: TokenService): Promise<void> {
    this.tokenService = tokenService;
    this.lastValid = this.isValid();
    tokenService.onDidChange(this.updateExtensionStatus, this);
    gitExtensionWrapper.onRepositoryCountChanged(this.updateExtensionStatus, this);
    await this.updateExtensionStatus();
  }

  private hasAnyTokens(): boolean {
    assert(this.tokenService, 'ExtensionState has not been initialized.');
    return this.tokenService.getInstanceUrls().length > 0;
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
