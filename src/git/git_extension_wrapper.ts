/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { extensions, Disposable } from 'vscode';
import { GitExtension } from '../api/git';
import { gitlabCredentialsProvider } from '../gitlab/clone/gitlab_credentials_provider';
import { GitLabRemoteSourceProviderRepository } from '../gitlab/clone/gitlab_remote_source_provider_repository';
import { handleError, log } from '../log';

export class GitExtensionWrapper implements Disposable {
  disposables = new Set<Disposable>();

  constructor(private gitExtension: GitExtension) {
    this.disposables.add(
      gitExtension.onDidChangeEnablement(this.onDidChangeGitExtensionEnablement, this),
    );
    this.onDidChangeGitExtensionEnablement(gitExtension.enabled);
  }

  private onDidChangeGitExtensionEnablement(enabled: boolean) {
    if (enabled) {
      this.initialize();
    } else {
      this.dispose();
    }
  }

  private initialize() {
    try {
      const gitAPI = this.gitExtension.getAPI(1);

      this.disposables.add(new GitLabRemoteSourceProviderRepository(gitAPI));
      this.disposables.add(gitAPI.registerCredentialsProvider(gitlabCredentialsProvider));
    } catch (err) {
      handleError(err);
    }
  }

  dispose(): void {
    this.disposables.forEach(d => d?.dispose());
    this.disposables.clear();
  }

  static registerToGitExtension(): Disposable {
    try {
      const gitExtension = extensions.getExtension<GitExtension>('vscode.git')?.exports;
      if (gitExtension !== undefined) {
        return new GitExtensionWrapper(gitExtension);
      }
      log('Could not get Git Extension');
    } catch (error) {
      handleError(error);
    }
    return { dispose: () => undefined };
  }
}
