import * as vscode from 'vscode';
import { pickWithQuery } from '../utils/pick_with_query';
import { GitLabRemote, GitLabRemoteSourceProvider } from './clone/gitlab_remote_source_provider';

export async function pickProject(instanceUrl: string): Promise<GitLabRemote | undefined> {
  const provider = new GitLabRemoteSourceProvider(instanceUrl);
  const other = {
    label: '$(globe) Other',
    description: 'Enter the path of a public project',
    alwaysShow: true,
  };

  type Item = GitLabRemote & vscode.QuickPickItem;
  type ItemOrOther = Item | typeof other;

  // Return the user's projects which match the query
  async function getItems(query?: string): Promise<ItemOrOther[]> {
    const sources = await provider.getRemoteSources(query);
    // The remote provider already adds $(repo) to the name
    const items = sources.map(s => ({ ...s, label: s.name }));
    return [other, ...items];
  }

  // Lookup a specific project by path
  async function lookupItem(path: string): Promise<Item | undefined> {
    const remote = await provider.lookupByPath(path);
    if (remote) return { ...remote, label: remote.name };

    await vscode.window.showWarningMessage(`Cannot find project with path '${path}'`);
    return undefined;
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
  if (picked !== other) {
    return picked as Item;
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
