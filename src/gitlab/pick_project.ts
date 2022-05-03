import * as vscode from 'vscode';
import { pickWithQuery } from '../utils/pick_with_query';
import { GitLabProject } from './gitlab_project';
import { GitLabService } from './gitlab_service';

export async function pickProject(
  gitlabService: GitLabService,
): Promise<GitLabProject | undefined> {
  const other = {
    label: '$(globe) Other',
    description: 'Enter the path of a public project',
    alwaysShow: true,
    other: true as const,
  };

  type Item = vscode.QuickPickItem & { project: GitLabProject; other: false };
  type ItemOrOther = Item | typeof other;

  // Return the user's projects which match the query
  async function getItems(query?: string): Promise<ItemOrOther[]> {
    const projects = await gitlabService.getProjects({ search: query });
    const items = projects.map(project => ({
      label: `$(repo) ${project.name}`,
      project,
      other: false as const,
    }));
    return [other, ...items];
  }

  // Lookup a specific project by path
  async function lookupItem(path: string): Promise<GitLabProject | undefined> {
    const project = await gitlabService.getProject(path);

    if (!project) await vscode.window.showWarningMessage(`Cannot find project with path '${path}'`);
    return project;
  }

  // Show the quick pick
  const { picked, query } = await pickWithQuery(
    {
      ignoreFocusOut: true,
      placeholder: 'Select GitLab project',
    },
    getItems,
  );

  // If the user picked an item other than `other`, return it
  if (picked && !picked.other) {
    return picked.project;
  }

  // If the user typed something in, resolve that as a project without prompting
  // them for input. This provides a similar UX to 'Git: Switch Branch'.
  if (query) {
    return lookupItem(query);
  }

  // The user selected 'Other' without typing anything in. Prompt them to
  // provide the path of a project.
  const input = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: 'Enter the path of a GitLab project',
  });
  if (input) {
    return lookupItem(input);
  }

  // The user canceled the input box
  return undefined;
}
