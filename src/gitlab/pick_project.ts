import * as vscode from 'vscode';
import { handleError } from '../log';
import { showQuickPick } from '../utils/show_quickpick';
import { GitLabRemote, GitLabRemoteSourceProvider } from './clone/gitlab_remote_source_provider';

export async function pickProject(instanceUrl: string): Promise<GitLabRemote | undefined> {
  const provider = new GitLabRemoteSourceProvider(instanceUrl);
  const otherItem = {
    label: '$(globe) Other',
    description: 'Enter the path of a public project',
    alwaysShow: true,
  };
  const pick = vscode.window.createQuickPick();
  pick.ignoreFocusOut = true;
  pick.placeholder = 'Select GitLab project';
  async function getItems(query?: string) {
    try {
      pick.busy = true;
      const sources = await provider.getRemoteSources(query);
      pick.items = [otherItem, ...sources.map(s => ({ ...s, label: s.name }))];
    } catch (e) {
      handleError(e);
    } finally {
      pick.busy = false;
    }
  }
  pick.onDidChangeValue(getItems);
  const [, picked] = await Promise.all([getItems(), showQuickPick(pick)]);

  if (picked !== otherItem) {
    return picked as GitLabRemote;
  }

  const input = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    prompt: otherItem.description,
    value: pick.value,
  });
  if (input) {
    const remote = await provider.lookupByPath(input);
    if (remote) return remote;

    await vscode.window.showWarningMessage(`Cannot find project with path '${pick.value}'`);
  }

  return undefined;
}
