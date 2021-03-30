/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { API, GitExtension } from '../api/git';
import { gitlabCredentialsProvider } from '../gitlab/clone/gitlab_credentials_provider';
import { GitLabRemoteSourceProviderRepository } from '../gitlab/clone/gitlab_remote_source_provider_repository';
import { handleError, log } from '../log';

export class GitExtensionWrapper implements vscode.Disposable {
  disposables = new Set<vscode.Disposable>();

  private gitApi?: API;

  private gitExtension?: GitExtension;

  private onDidChangeGitExtensionEnablement(enabled: boolean) {
    if (enabled) {
      this.register();
    } else {
      this.dispose();
    }
  }

  get gitBinaryPath(): string {
    const path = this.gitApi?.git.path;
    assert(path, 'Could not get git binary path from the Git extension.');
    return path;
  }

  private register() {
    assert(this.gitExtension);
    try {
      this.gitApi = this.gitExtension.getAPI(1);

      this.disposables.add(new GitLabRemoteSourceProviderRepository(this.gitApi));
      this.disposables.add(this.gitApi.registerCredentialsProvider(gitlabCredentialsProvider));
    } catch (err) {
      handleError(err);
    }
  }

  dispose(): void {
    this.gitApi = undefined;
    this.disposables.forEach(d => d?.dispose());
    this.disposables.clear();
  }

  init(): void {
    try {
      this.gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
      if (this.gitExtension !== undefined) {
        this.disposables.add(
          this.gitExtension.onDidChangeEnablement(this.onDidChangeGitExtensionEnablement, this),
        );
        this.onDidChangeGitExtensionEnablement(this.gitExtension.enabled);
      }
      log('Could not get Git Extension');
    } catch (error) {
      handleError(error);
    }
  }
}

export const gitExtensionWrapper = new GitExtensionWrapper();
