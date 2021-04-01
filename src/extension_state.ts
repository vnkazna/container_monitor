import * as vscode from 'vscode';
import * as assert from 'assert';
import { TokenService } from './services/token_service';

export class ExtensionState {
  private changeValidEmitter = new vscode.EventEmitter<void>();

  onDidChangeValid = this.changeValidEmitter.event;

  tokenService?: TokenService;

  private lastValid = false;

  async init(tokenService: TokenService): Promise<void> {
    this.tokenService = tokenService;
    this.lastValid = this.isValid();
    tokenService.onDidChange(this.updateExtensionStatus, this);
    await this.updateExtensionStatus();
  }

  private hasAnyTokens(): boolean {
    assert(this.tokenService, 'ExtensionState has not been initialized.');
    return this.tokenService.getInstanceUrls().length > 0;
  }

  isValid(): boolean {
    return this.hasAnyTokens();
  }

  async updateExtensionStatus(): Promise<void> {
    const noTokens = !this.hasAnyTokens();
    await vscode.commands.executeCommand('setContext', 'gitlab:noToken', noTokens);
    await vscode.commands.executeCommand('setContext', 'gitlab:validState', this.isValid());
    if (this.lastValid !== this.isValid()) {
      this.lastValid = this.isValid();
      this.changeValidEmitter.fire();
    }
  }
}

export const extensionState = new ExtensionState();
