import * as vscode from 'vscode';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { GitRemote } from '../git/git_remote_parser';
import { WrappedRepository } from '../git/wrapped_repository';
import { GitLabProject } from '../gitlab/gitlab_project';
import { doNotAwait } from '../utils/do_not_await';
import { setPreferredRemote } from '../utils/extension_configuration';

export type GitLabRepository = Omit<WrappedRepository, 'getProject'> & {
  remote: GitRemote;
  getProject: () => Promise<GitLabProject>;
};

export interface GitLabRepositoryAndFile {
  repository: GitLabRepository;
  activeEditor: vscode.TextEditor;
}

/** Command that needs a valid GitLab project to run */
export type ProjectCommand = (gitlabRepository: GitLabRepository) => Promise<void>;

/** Command that needs to be executed on an open file from a valid GitLab project */
export type ProjectFileCommand = (repositoryAndFile: GitLabRepositoryAndFile) => Promise<void>;

const getRemoteOrSelectOne = async (repository: WrappedRepository) => {
  const { remote } = repository;
  if (remote) return remote;

  if (repository.remoteNames.length === 0) {
    throw new Error(
      `Repository "${repository.rootFsPath}" has no remotes. Add a git remote that points to a GitLab project to continue.`,
    );
  }
  const result = await vscode.window.showQuickPick(
    repository.remoteNames.map(n => ({ label: n })),
    { placeHolder: 'Select which git remote contains your GitLab project.' },
  );

  if (!result) return undefined;
  await setPreferredRemote(repository.rootFsPath, result.label);
  doNotAwait(
    vscode.window.showInformationMessage(
      `Remote "${result.label}" has been added to your settings as your preferred remote.`,
    ),
  );
  return repository.remote;
};

const ensureGitLabProject = async (
  repository: WrappedRepository,
): Promise<GitLabRepository | undefined> => {
  const remote = await getRemoteOrSelectOne(repository);
  if (!remote) return undefined;
  const project = await repository.getProject();
  if (!project)
    throw new Error(
      `Project "${remote.namespace}/${remote.project}" was not found on "${repository.instanceUrl}" GitLab instance.
      Make sure your git remote points to an existing GitLab project.`,
    );

  return repository as GitLabRepository;
};

export const runWithValidProject = (command: ProjectCommand): (() => Promise<void>) => {
  return async () => {
    const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
    if (!repository) {
      return undefined;
    }
    const repositoryWithProject = await ensureGitLabProject(repository);
    if (!repositoryWithProject) return undefined;
    return command(repositoryWithProject);
  };
};

export const runWithValidProjectFile = (command: ProjectFileCommand): (() => Promise<void>) => {
  return async () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      await vscode.window.showInformationMessage('GitLab Workflow: No open file.');
      return undefined;
    }

    const repository = gitExtensionWrapper.getActiveRepository();

    if (!repository) {
      await vscode.window.showInformationMessage(
        'GitLab Workflow: Open file isn’t part of a repository.',
      );
      return undefined;
    }
    const gitlabRepository = await ensureGitLabProject(repository);
    if (!gitlabRepository) return undefined;
    return command({ activeEditor, repository: gitlabRepository });
  };
};
