import { EventEmitter, ExtensionContext, Event } from 'vscode';

export class TokenService {
  context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  private onDidChangeEmitter = new EventEmitter<void>();

  get onDidChange(): Event<void> {
    return this.onDidChangeEmitter.event;
  }

  private get glTokenMap() {
    return this.context.globalState.get<Record<string, string>>('glTokens', {});
  }

  get instanceUrls() {
    return Object.keys(this.glTokenMap);
  }

  getToken(instanceUrl: string) {
    return this.glTokenMap[instanceUrl];
  }

  setToken(instanceUrl: string, token: string | undefined) {
    const tokenMap = this.glTokenMap;

    if (token) {
      tokenMap[instanceUrl] = token;
    } else {
      delete tokenMap[instanceUrl];
    }

    this.context.globalState.update('glTokens', tokenMap);
    this.onDidChangeEmitter.fire();
  }
}
