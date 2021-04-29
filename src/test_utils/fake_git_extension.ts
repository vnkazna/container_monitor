/* eslint-disable max-classes-per-file, @typescript-eslint/no-explicit-any */

import { API } from '../api/git';

const removeFromArray = (array: any[], element: any): any[] => {
  return array.filter(el => el !== element);
};

/**
 * This is a simple test double for the native Git extension API
 *
 * It allows us to test our cloning feature without mocking every response
 * and validating arguments of function calls.
 */
class FakeGitApi {
  public credentialsProviders: any[] = [];

  public remoteSourceProviders: any[] = [];

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
  public enabled = true;

  public enablementListeners: (() => any)[] = [];

  public gitApi = new FakeGitApi();

  onDidChangeEnablement(listener: () => any) {
    this.enablementListeners.push(listener);
    return {
      dispose: () => {
        /* */
      },
    };
  }

  getAPI(): API {
    return (this.gitApi as unknown) as API;
  }
}
