/* eslint-disable max-classes-per-file */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import * as vscode from 'vscode';
import { API, GitExtension, Repository } from '../api/git';
import { gitlabCredentialsProvider } from '../gitlab/clone/gitlab_credentials_provider';
import { GitLabRemoteSourceProviderRepository } from '../gitlab/clone/gitlab_remote_source_provider_repository';
import { CachedMr, WrappedRepository } from './wrapped_repository';
import { handleError, log } from '../log';
import { REMOTE_URI_SCHEME } from '../constants';
import { GitLabNewService } from '../gitlab/gitlab_new_service';
import { GitLabProject } from '../gitlab/gitlab_project';
import { GitRemote, parseGitRemote } from './git_remote_parser';
import { GitLabRemoteFileSystem, GitLabRemotePath } from '../remotefs/gitlab_remote_file_system';

class VirtualRepository {
  //FIXME create united interface with WrappedRepository
  virtualWorkspace: vscode.WorkspaceFolder;

  parsedRemoteFsUri: GitLabRemotePath;
  private mrCache: Record<number, CachedMr> = {};

  constructor(workspace: vscode.WorkspaceFolder) {
    assert.strictEqual(workspace.uri.scheme, REMOTE_URI_SCHEME);
    this.virtualWorkspace = workspace;
    this.parsedRemoteFsUri = GitLabRemoteFileSystem.parseUri(workspace.uri);
  }

  private cachedProject?: GitLabProject;

  get remoteNames(): string[] {
    return ['virtual-workspace'];
  }

  async fetch(): Promise<void> {
    return;
  }

  checkout(branchName: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  getRemoteByName(remoteName: string): GitRemote {
    throw new Error('Method not implemented.');
  }

  async getProject(): Promise<GitLabProject | undefined> {
    if (this.cachedProject) return this.cachedProject;
    this.cachedProject = await this.getGitLabService().getRestProject(
      this.parsedRemoteFsUri.project,
    );
    return this.cachedProject;
  }

  get containsGitLabProject(): boolean {
    // return Boolean(this.cachedProject);
    return true;
  }

  get branch(): string | undefined {
    return this.parsedRemoteFsUri.ref; // FIXME this might not be a branch
  }

  async reloadMr(mr: RestMr): Promise<CachedMr> {
    const mrVersion = await this.getGitLabService().getMrDiff(mr);
    const cachedMr = {
      mr,
      mrVersion,
    };
    this.mrCache[mr.id] = cachedMr;
    return cachedMr;
  }

  getMr(id: number): CachedMr | undefined {
    return this.mrCache[id];
  }

  get remote(): GitRemote | undefined {
    return (
      (this.cachedProject && parseGitRemote(this.cachedProject.sshUrlToRepo)) || ({} as GitRemote)
    );
  }

  get lastCommitSha(): string | undefined {
    throw new Error('Method not implemented.');
  }

  get instanceUrl(): string {
    return GitLabRemoteFileSystem.parseUri(this.virtualWorkspace.uri).instance.toString();
  }

  getGitLabService(): GitLabNewService {
    return new GitLabNewService(this.instanceUrl);
  }

  get name(): string {
    return 'test name';
  }

  get rootFsPath(): string {
    return this.virtualWorkspace.uri.toString();
  }

  async getFileContent(path: string, sha: string): Promise<string | null> {
    return null;
  }
  diff(): Promise<string> {
    throw new Error('Method not implemented.');
  }
  apply(patchPath: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  getTrackingBranchName(): Promise<string> {
    throw new Error('Method not implemented.');
  }
  hasSameRootAs(repository: Repository): boolean {
    throw new Error('Method not implemented.');
  }
  getVersion(): Promise<string | undefined> {
    throw new Error('Method not implemented.');
  }
  private get rawRepository(): Repository {
    throw new Error('Method not implemented.');
  }

  get remoteName(): string | undefined {
    return 'virtual-workspace';
  }
}
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
    const remoteWorkspaces =
      vscode.workspace.workspaceFolders?.filter(wf => wf.uri.scheme === REMOTE_URI_SCHEME) ?? [];
    return [
      ...this.wrappedRepositories,
      ...remoteWorkspaces.map(w => new VirtualRepository(w) as unknown as WrappedRepository),
    ];
  }

  getRepository(repositoryRoot: string): WrappedRepository {
    const repository = this.repositories.find(r => r.rootFsPath === repositoryRoot);
    if (!repository) throw new Error(`repository with root ${repositoryRoot} not found.`);
    return repository;
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

    if (vscode.window.activeTextEditor?.document.uri.scheme === REMOTE_URI_SCHEME) {
      const workspace = vscode.workspace.getWorkspaceFolder(
        vscode.window.activeTextEditor.document.uri,
      );
      if (workspace) {
        return new VirtualRepository(workspace) as unknown as WrappedRepository;
      }
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
