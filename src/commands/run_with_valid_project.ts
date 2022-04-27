import * as vscode from 'vscode';
import { USER_COMMANDS } from '../command_names';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { GitLabRepository, WrappedRepository } from '../git/wrapped_repository';
import { ProjectInRepository } from '../gitlab/new_project';
import { convertRepositoryToProject } from '../utils/convert_repository_to_project';
import { doNotAwait } from '../utils/do_not_await';
import { setPreferredRemote } from '../utils/extension_configuration';

export interface GitLabRepositoryAndFile {
  repository: GitLabRepository;
  activeEditor: vscode.TextEditor;
}

export interface ProjectInRepositoryAndFile {
  projectInRepository: ProjectInRepository;
  activeEditor: vscode.TextEditor;
}

function getRepositoryForActiveEditor(): WrappedRepository | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor?.document.uri) {
    return undefined;
  }

  return gitExtensionWrapper.getRepositoryForFile(editor.document.uri);
}

/**
 * This method doesn't require any user input and should be used only for automated functionality.
 * (e.g. periodical status bar refresh). If there is any uncertainty about which repository to choose,
 * (i.e. there's multiple repositories and no open editor) we return undefined.
 */
export const getActiveRepository: () => WrappedRepository | undefined = () => {
  const activeEditorRepository = getRepositoryForActiveEditor();

  if (activeEditorRepository) {
    return activeEditorRepository;
  }

  if (gitExtensionWrapper.repositories.length === 1) {
    return gitExtensionWrapper.repositories[0];
  }

  return undefined;
};

/**
 * Returns active repository, user-selected repository or undefined if there
 * are no repositories or user didn't select one.
 */
// TODO: exported only for testing
export const getActiveRepositoryOrSelectOne: () => Promise<
  WrappedRepository | undefined
> = async () => {
  const activeRepository = getActiveRepository();

  if (activeRepository) {
    return activeRepository;
  }

  if (gitExtensionWrapper.repositories.length === 0) {
    return undefined;
  }

  const repositoryOptions = gitExtensionWrapper.repositories.map(wr => ({
    label: wr.name,
    repository: wr,
  }));
  const selection = await vscode.window.showQuickPick(repositoryOptions, {
    placeHolder: 'Select a repository',
  });
  return selection?.repository;
};

/** Command that needs a valid GitLab project to run */
export type ProjectCommand = (gitlabRepository: GitLabRepository) => Promise<void>;
export type NewProjectCommand = (projectInRepository: ProjectInRepository) => Promise<void>;

/** Command that needs to be executed on an open file from a valid GitLab project */
type ProjectFileCommandOld = (repositoryAndFile: GitLabRepositoryAndFile) => Promise<void>;
export type ProjectFileCommand = (
  projectInRepositoryAndFile: ProjectInRepositoryAndFile,
) => Promise<void>;

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
      `Project "${remote.namespaceWithPath}" was not found on "${repository.instanceUrl}" GitLab instance.
      Make sure your git remote points to an existing GitLab project.`,
    );

  return repository as GitLabRepository;
};

export const runWithValidProjectOld =
  (command: ProjectCommand): (() => Promise<void>) =>
  async () => {
    const repository = await getActiveRepositoryOrSelectOne();
    if (!repository) {
      return undefined;
    }
    const repositoryWithProject = await ensureGitLabProject(repository);
    if (!repositoryWithProject) return undefined;
    return command(repositoryWithProject);
  };

export const runWithValidProject = (command: NewProjectCommand): (() => Promise<void>) =>
  runWithValidProjectOld(async gitLabRepository =>
    command(await convertRepositoryToProject(gitLabRepository)),
  );

export const runWithValidProjectFileOld =
  (command: ProjectFileCommandOld): (() => Promise<void>) =>
  async () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      await vscode.window.showInformationMessage('GitLab Workflow: No open file.');
      return undefined;
    }

    const repository = getActiveRepository();

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

export const runWithValidProjectFile = (command: ProjectFileCommand): (() => Promise<void>) =>
  runWithValidProjectFileOld(async ({ activeEditor, repository }) =>
    command({ activeEditor, projectInRepository: await convertRepositoryToProject(repository) }),
  );

export const diagnoseRepository = async (repository: WrappedRepository) => {
  const repositoryWithProject = await ensureGitLabProject(repository);
  if (!repositoryWithProject) return vscode.commands.executeCommand(USER_COMMANDS.SHOW_OUTPUT);
  return vscode.commands.executeCommand(USER_COMMANDS.REFRESH_SIDEBAR);
};
