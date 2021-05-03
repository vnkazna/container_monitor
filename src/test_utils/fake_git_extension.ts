/* eslint-disable max-classes-per-file, @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';
import { API, Repository } from '../api/git';
import { EventEmitter } from './event_emitter';

const removeFromArray = (array: any[], element: any): any[] => {
  return array.filter(el => el !== element);
};

export const createFakeRepository = (rootUriPath: string): Repository =>
  (({ rootUri: vscode.Uri.file(rootUriPath) } as unknown) as Repository);

/**
 * This is a simple test double for the native Git extension API
 *
 * It allows us to test our cloning feature without mocking every response
 * and validating arguments of function calls.
 */
class FakeGitApi {
  credentialsProviders: any[] = [];

  remoteSourceProviders: any[] = [];

  repositories: Repository[] = [];

  onDidOpenRepositoryEmitter = new EventEmitter<Repository>();

  onDidOpenRepository = this.onDidOpenRepositoryEmitter.event;

  onDidCloseRepositoryEmitter = new EventEmitter<Repository>();

  onDidCloseRepository = this.onDidCloseRepositoryEmitter.event;

  registerCredentialsProvider(provider: any) {
    this.credentialsProviders.push(provider);
    return {
      dispose: () => {
        this.credentialsProviders = removeFromArray(this.credentialsProviders, provider);
      },
    };
  }

  registerRemoteSourceProvider(provider: any) {
    this.remoteSourceProviders.push(provider);
    return {
      dispose: () => {
        this.remoteSourceProviders = removeFromArray(this.remoteSourceProviders, provider);
      },
    };
  }
}

/**
 * This is a simple test double for the native Git extension
 *
 * We use it to test enabling and disabling the extension.
 */
export class FakeGitExtension {
  enabled = true;

  enablementListeners: (() => any)[] = [];

  gitApi = new FakeGitApi();

  onDidChangeEnablementEmitter = new EventEmitter<boolean>();

  onDidChangeEnablement = this.onDidChangeEnablementEmitter.event;

  getAPI(): API {
    return (this.gitApi as unknown) as API;
  }
}
