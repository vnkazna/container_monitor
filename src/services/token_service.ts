import assert from 'assert';
import { EventEmitter, ExtensionContext, Event } from 'vscode';
import { removeTrailingSlash } from '../utils/remove_trailing_slash';

export class TokenService {
  context?: ExtensionContext;

  private onDidChangeEmitter = new EventEmitter<void>();

  init(context: ExtensionContext): void {
    this.context = context;
  }

  get onDidChange(): Event<void> {
    return this.onDidChangeEmitter.event;
  }

  private get glTokenMap(): Record<string, string | undefined> {
    assert(this.context);
    return this.context.globalState.get('glTokens', {});
  }

  getInstanceUrls(): string[] {
    return Object.keys(this.glTokenMap);
  }

  getToken(instanceUrl: string): string | undefined {
    // the first part of the return (`this.glTokenMap[instanceUrl]`)
    // can be removed on 2022-08-15 (year after new tokens can't contain trailing slash)
    return this.glTokenMap[instanceUrl] || this.glTokenMap[removeTrailingSlash(instanceUrl)];
  }

  async setToken(instanceUrl: string, token: string | undefined): Promise<void> {
    assert(this.context);
    const tokenMap = this.glTokenMap;

    if (token) {
      tokenMap[removeTrailingSlash(instanceUrl)] = token;
    } else {
      delete tokenMap[instanceUrl];
    }

    await this.context.globalState.update('glTokens', tokenMap);
    this.onDidChangeEmitter.fire();
  }
}

export const tokenService: TokenService = new TokenService();
