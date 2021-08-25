/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import * as vscode from 'vscode';
import { API, GitExtension, Repository } from '../api/git';
import { gitlabCredentialsProvider } from '../gitlab/clone/gitlab_credentials_provider';
import { GitLabRemoteSourceProviderRepository } from '../gitlab/clone/gitlab_remote_source_provider_repository';
import { WrappedRepository } from './wrapped_repository';
import { handleError, log } from '../log';

export class GitExtensionWrapper implements vscode.Disposable {
  apiListeners: vscode.Disposable[] = [];

  private enablementListener?: vscode.Disposable;

  private wrappedRepositories: WrappedRepository[] = [];

  private repositoryCountChangedEmitter = new vscode.EventEmitter<void>();

  /** Gets triggered when user adds or removes repository or when user enables and disables the git extension */
  onRepositoryCountChanged = this.repositoryCountChangedEmitter.event;

  private gitApi?: API;

  private gitExtension?: GitExtension;

  private async onDidChangeGitExtensionEnablement(enabled: boolean) {
    if (enabled) {
      this.register();
      await this.addRepositories(this.gitApi?.repositories ?? []);
    } else {
      this.wrappedRepositories = [];
      this.repositoryCountChangedEmitter.fire();
      this.disposeApiListeners();
    }
  }

  get gitBinaryPath(): string {
    const path = this.gitApi?.git.path;
    assert(path, 'Could not get git binary path from the Git extension.');
    return path;
  }

  get repositories(): WrappedRepository[] {
    return this.wrappedRepositories;
  }

  getRepository(repositoryRoot: string): WrappedRepository {
    const rawRepository = this.gitApi?.getRepository(vscode.Uri.file(repositoryRoot));
    assert(rawRepository, `Git Extension doesn't have repository with root ${repositoryRoot}`);
    const result = this.repositories.find(r => r.hasSameRootAs(rawRepository));
    assert(result, `GitExtensionWrapper is missing repository for ${repositoryRoot}`);
    return result;
  }

  private register() {
    assert(this.gitExtension);
    try {
      this.gitApi = this.gitExtension.getAPI(1);
      [
        new GitLabRemoteSourceProviderRepository(this.gitApi),
        this.gitApi.registerCredentialsProvider(gitlabCredentialsProvider),
        this.gitApi.onDidOpenRepository(r => this.addRepositories([r])),
        this.gitApi.onDidCloseRepository(r => this.removeRepository(r)),
      ];
    } catch (err) {
      handleError(err);
    }
  }

  private async addRepositories(repositories: Repository[]) {
    await Promise.all(repositories.map(r => r.status())); // make sure the repositories are initialized
    this.wrappedRepositories = [
      ...this.wrappedRepositories,
      ...repositories.map(r => new WrappedRepository(r)),
    ];
    this.repositoryCountChangedEmitter.fire();
  }

  private removeRepository(repository: Repository) {
    this.wrappedRepositories = this.wrappedRepositories.filter(wr => !wr.hasSameRootAs(repository));
    this.repositoryCountChangedEmitter.fire();
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

  async init(): Promise<void> {
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
      await this.onDidChangeGitExtensionEnablement(this.gitExtension.enabled);
    } catch (error) {
      handleError(error);
    }
  }

  private getRepositoryForActiveEditor(): WrappedRepository | undefined {
    const editor = vscode.window.activeTextEditor;
    if (!editor?.document.uri) {
      return undefined;
    }

    const repositoryForActiveFile = this.gitApi?.getRepository(editor.document.uri);
    if (!repositoryForActiveFile) return undefined;
    return this.repositories.find(wr => wr.hasSameRootAs(repositoryForActiveFile));
  }

  /**
   * This method doesn't require any user input and should be used only for automated functionality.
   * (e.g. periodical status bar refresh). If there is any uncertainty about which repository to choose,
   * (i.e. there's multiple repositories and no open editor) we return undefined.
   */
  getActiveRepository(): WrappedRepository | undefined {
    const activeEditorRepository = this.getRepositoryForActiveEditor();

    if (activeEditorRepository) {
      return activeEditorRepository;
    }

    if (this.repositories.length === 1) {
      return this.repositories[0];
    }

    return undefined;
  }

  /**
   * Returns active repository, user-selected repository or undefined if there
   * are no repositories or user didn't select one.
   */
  async getActiveRepositoryOrSelectOne(): Promise<WrappedRepository | undefined> {
    const activeRepository = this.getActiveRepository();

    if (activeRepository) {
      return activeRepository;
    }

    if (this.repositories.length === 0) {
      return undefined;
    }

    const repositoryOptions = this.repositories.map(wr => ({
      label: wr.name,
      repository: wr,
    }));
    const selection = await vscode.window.showQuickPick(repositoryOptions, {
      placeHolder: 'Select a repository',
    });
    return selection?.repository;
  }
}

export const gitExtensionWrapper = new GitExtensionWrapper();
