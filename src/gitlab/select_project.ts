import vscode from 'vscode';
import { PROGRAMMATIC_COMMANDS } from '../command_names';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { createRemoteUrlPointers, GitRemoteUrlPointer, GitRepository } from '../git/new_git';
import { Credentials, tokenService } from '../services/token_service';
import { gitlabProjectRepository } from './gitlab_project_repository';
import { ProjectInRepository } from './new_project';
import { pickProject } from './pick_project';
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

const pickCredentials = async (allCredentials: Credentials[]) => {
  if (allCredentials.length === 0) return undefined;
  if (allCredentials.length === 1) return allCredentials[0];

  return vscode.window.showQuickPick(
    allCredentials.map(c => ({ ...c, label: c.instanceUrl })),
    { title: 'Select token' },
  );
};

const pickRemoteUrl = async (pointers: GitRemoteUrlPointer[]) => {
  if (pointers.length === 0) return undefined;
  if (pointers.length === 1) return pointers[0];
  return vscode.window.showQuickPick(
    pointers.map(p => ({ ...p, label: p.urlEntry.url, description: p.remote.name })),
    { title: 'Select remote URL' },
  );
};

const manuallyAssignProject = async (repository: GitRepository) => {
  const credentials = await pickCredentials(tokenService.getAllCredentials());
  if (!credentials) return;
  const pointer = await pickRemoteUrl(createRemoteUrlPointers(repository));
  if (!pointer) return;
  const remote = await pickProject(credentials);
  if (!remote) return;
  const projectInRepository: ProjectInRepository = {
    credentials,
    pointer,
    project: remote.project,
    initializationType: 'selected',
  };
  const selectedProjectSetting = convertProjectToSetting(projectInRepository);
  selectedProjectStore.addSelectedProject(selectedProjectSetting);
  await vscode.window.showInformationMessage(
    `Success: you assigned project ${remote.project.namespaceWithPath} to remote URL ${pointer.urlEntry.url} in repository ${repository.rootFsPath}`,
  );
};

export const selectProject = async (repository: GitRepository) => {
  const projects = gitlabProjectRepository
    .getAllProjects()
    .filter(p => p.pointer.repository.rootFsPath === repository.rootFsPath);
  const options = [
    ...projects.map(p => ({
      ...p,
      label: p.project.namespaceWithPath,
      description: 'detected',
      detail: `${p.credentials.instanceUrl}`,
      isOther: false as const,
    })),
    {
      label: 'Manually assign GitLab project to the repository',
      detail: 'Use this if your Git remote URL does not have the standard format.',
      isOther: true as const,
    },
  ];
  const selectedProject = await vscode.window.showQuickPick(options, {
    title: 'Select GitLab project',
  });
  if (!selectedProject) return;
  if (selectedProject.isOther) {
    await manuallyAssignProject(repository);
    return;
  }
  selectedProjectStore.addSelectedProject(convertProjectToSetting(selectedProject));
};

export const selectProjectForRepository = () =>
  selectRepositoryAndThenRun(PROGRAMMATIC_COMMANDS.SELECT_PROJECT);
