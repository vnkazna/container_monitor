import * as vscode from 'vscode';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { GitRemote } from '../git/git_remote_parser';
import { WrappedRepository } from '../git/wrapped_repository';
import { GitLabProject } from '../gitlab/gitlab_project';
import { getRepositorySettings, setPreferredRemote } from '../utils/extension_configuration';

export interface RepositoryWithProject {
  repository: WrappedRepository;
  remote: GitRemote;
  project: GitLabProject;
}

/** Command that needs a valid GitLab project to run */
export type ProjectCommand = (repositoryWithProject: RepositoryWithProject) => Promise<void>;

const isAmbiguousRemote = (repositoryRoot: string, remoteNames: string[]) => {
  return remoteNames.length > 1 && !getRepositorySettings(repositoryRoot)?.preferredRemoteName;
};

const getRemoteOrSelectOne = async (repository: WrappedRepository) => {
  const { remote } = repository;
  if (remote) return remote;

  if (!isAmbiguousRemote(repository.rootFsPath, repository.remoteNames)) {
    return undefined;
  }
  const result = await vscode.window.showQuickPick(
    repository.remoteNames.map(n => ({ label: n })),
    { placeHolder: 'Select which git remote contains your GitLab project.' },
  );

  if (!result) return undefined;
  await setPreferredRemote(repository.rootFsPath, result.label);
  return repository.remote;
};

const getRepositoryWithProject = async (): Promise<RepositoryWithProject | undefined> => {
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  if (!repository) {
    return undefined;
  }
  const remote = await getRemoteOrSelectOne(repository);
  if (!remote) return undefined;
  const project = await repository.getProject();
  if (!project) return undefined;
  return { repository, remote, project };
};

export const runWithValidProject = (command: ProjectCommand): (() => Promise<void>) => {
  return async () => {
    const repositoryWithProject = await getRepositoryWithProject();
    if (!repositoryWithProject) return undefined;
    return command(repositoryWithProject);
  };
};
