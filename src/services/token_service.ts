import * as assert from 'assert';
import { EventEmitter, ExtensionContext, Event } from 'vscode';

export class TokenService {
  context?: ExtensionContext;

  private onDidChangeEmitter = new EventEmitter<void>();

  init(context: ExtensionContext) {
    this.context = context;
  }

  get onDidChange(): Event<void> {
    return this.onDidChangeEmitter.event;
  }

  private get glTokenMap() {
    assert(this.context);
    return this.context.globalState.get<Record<string, string>>('glTokens', {});
  }

  getInstanceUrls() {
    return Object.keys(this.glTokenMap);
  }

  getToken(instanceUrl: string) {
    return this.glTokenMap[instanceUrl];
  }

  async setToken(instanceUrl: string, token: string | undefined) {
    assert(this.context);
    const tokenMap = this.glTokenMap;

    if (token) {
      tokenMap[instanceUrl] = token;
    } else {
      delete tokenMap[instanceUrl];
    }

    await this.context.globalState.update('glTokens', tokenMap);
    this.onDidChangeEmitter.fire();
  }
}

export const tokenService: TokenService = new TokenService();
