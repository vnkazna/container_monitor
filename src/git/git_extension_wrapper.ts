/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { API, GitExtension, Repository } from '../api/git';
import { gitlabCredentialsProvider } from '../gitlab/clone/gitlab_credentials_provider';
import { GitLabRemoteSourceProviderRepository } from '../gitlab/clone/gitlab_remote_source_provider_repository';
import { handleError, log } from '../log';

export class GitExtensionWrapper implements vscode.Disposable {
  apiListeners: vscode.Disposable[] = [];

  private enablementListener?: vscode.Disposable;

  private repositoryCountChangedEmitter = new vscode.EventEmitter<void>();

  /** Gets triggered when user adds or removes repository or when user enables and disables the git extension */
  onRepositoryCountChanged = this.repositoryCountChangedEmitter.event;

  private gitApi?: API;

  private gitExtension?: GitExtension;

  private onDidChangeGitExtensionEnablement(enabled: boolean) {
    if (enabled) {
      this.register();
    } else {
      this.disposeApiListeners();
    }
    this.repositoryCountChangedEmitter.fire();
  }

  get gitBinaryPath(): string {
    const path = this.gitApi?.git.path;
    assert(path, 'Could not get git binary path from the Git extension.');
    return path;
  }

  get repositories(): Repository[] {
    return this.gitApi?.repositories ?? [];
  }

  private register() {
    assert(this.gitExtension);
    try {
      this.gitApi = this.gitExtension.getAPI(1);
      this.apiListeners = [
        new GitLabRemoteSourceProviderRepository(this.gitApi),
        this.gitApi.registerCredentialsProvider(gitlabCredentialsProvider),
        this.gitApi.onDidOpenRepository(() => this.repositoryCountChangedEmitter.fire()),
        this.gitApi.onDidCloseRepository(() => this.repositoryCountChangedEmitter.fire()),
      ];
    } catch (err) {
      handleError(err);
    }
  }

  disposeApiListeners(): void {
    this.gitApi = undefined;
    this.apiListeners.forEach(d => d?.dispose());
    this.apiListeners = [];
  }

  dispose(): void {
    this.disposeApiListeners();
    this.enablementListener?.dispose();
  }

  init(): void {
    try {
      this.gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
      if (!this.gitExtension) {
        log('Could not get Git Extension');
        return;
      }
      this.enablementListener = this.gitExtension.onDidChangeEnablement(
        this.onDidChangeGitExtensionEnablement,
        this,
      );
      this.onDidChangeGitExtensionEnablement(this.gitExtension.enabled);
    } catch (error) {
      handleError(error);
    }
  }
}

export const gitExtensionWrapper = new GitExtensionWrapper();
