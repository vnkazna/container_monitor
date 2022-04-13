import vscode from 'vscode';
import { PROGRAMMATIC_COMMANDS } from '../command_names';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { GitRepository } from '../git/new_git';
import { gitlabProjectRepository } from './gitlab_project_repository';
import { convertProjectToSetting, selectedProjectStore } from './selected_project_store';

export const selectRepositoryAndThenRun = async <T>(
  commandName: string,
): Promise<T | undefined> => {
  const options = gitExtensionWrapper.gitRepositories.map(repository => ({
    repository,
    label: repository.rootFsPath,
  }));
  const choice = await vscode.window.showQuickPick(options, { title: 'Select Git Repository' });
  if (!choice) return undefined;
  return vscode.commands.executeCommand(commandName, choice.repository);
};

export const selectProject = async (repository: GitRepository) => {
  const projects = gitlabProjectRepository
    .getAllProjects()
    .filter(p => p.pointer.repository.rootFsPath === repository.rootFsPath);
  if (projects.length === 0) {
    await vscode.window.showErrorMessage(
      `There are no GitLab projects in ${repository.rootFsPath} repository.`,
    );
    return;
  }
  const selectedProject = await vscode.window.showQuickPick(
    projects.map(p => ({ ...p, label: p.project.namespaceWithPath })),
    {
      title: 'Select GitLab project',
    },
  );
  if (!selectedProject) return;
  selectedProjectStore.addSelectedProject(convertProjectToSetting(selectedProject));
};

export const selectProjectForRepository = () =>
  selectRepositoryAndThenRun(PROGRAMMATIC_COMMANDS.SELECT_PROJECT);
