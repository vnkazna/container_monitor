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
  disposables = new Set<vscode.Disposable>();

  private repositoryCountChangedEmitter = new vscode.EventEmitter<void>();

  /** Gets triggered when user adds or removes repository or when user enables and disables the git extension */
  onRepositoryCountChanged = this.repositoryCountChangedEmitter.event;

  private gitApi?: API;

  private gitExtension?: GitExtension;

  private onDidChangeGitExtensionEnablement(enabled: boolean) {
    if (enabled) {
      this.register();
    } else {
      this.dispose();
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
      [
        new GitLabRemoteSourceProviderRepository(this.gitApi),
        this.gitApi.registerCredentialsProvider(gitlabCredentialsProvider),
        this.gitApi.onDidOpenRepository(() => this.repositoryCountChangedEmitter.fire()),
        this.gitApi.onDidCloseRepository(() => this.repositoryCountChangedEmitter.fire()),
      ].forEach(d => this.disposables.add(d));
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
