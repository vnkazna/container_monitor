import * as vscode from 'vscode';
import { pickWithQuery, QuickPickInitOptions } from '../utils/pick_with_query';
import { GitLabRemote, GitLabRemoteSourceProvider } from './clone/gitlab_remote_source_provider';

/**
 * Exported for testing.
 *
 * Shows a quickpick, using the query function to update the list of items when
 * the user types, and including an always visible option that allows the user
 * to input their own value.
 * @param quickpick the quickpick to show
 * @param queryfn a function that is used to update the items when the user
 * @param other the item to use for other input
 * @param resolveOther a function to resolve other input to an item
 * types
 * @returns the selected item or resolved other input
 */
export async function pickWithOther<
  TItem extends vscode.QuickPickItem,
  TOther extends vscode.QuickPickItem
>(
  init: Omit<QuickPickInitOptions<never>, 'items'>,
  queryfn: (_?: string) => Thenable<TItem[]>,
  other: TOther & { alwaysShow: true },
  resolveOther: (_: string) => Thenable<TItem | undefined>,
): Promise<TItem | undefined> {
  const { picked, finalQuery: value } = await pickWithQuery(init, async query => [
    other,
    ...(await queryfn(query)),
  ]);

  if (picked !== other) {
    return picked as TItem;
  }

  const input = await vscode.window.showInputBox({
    ignoreFocusOut: init.ignoreFocusOut,
    prompt: other.description,
    value,
  });
  if (input) {
    return resolveOther(input);
  }

  return undefined;
}

export async function pickProject(instanceUrl: string): Promise<GitLabRemote | undefined> {
  const provider = new GitLabRemoteSourceProvider(instanceUrl);
  return pickWithOther(
    {
      ignoreFocusOut: true,
      placeholder: 'Select GitLab project',
    },
    async query => {
      const sources = await provider.getRemoteSources(query);
      // The remote provider already adds $(repo) to the name
      return sources.map(x => ({ ...x, label: x.name }));
    },
    {
      label: '$(globe) Other',
      description: 'Enter the path of a public project',
      alwaysShow: true,
    },
    async value => {
      const remote = await provider.lookupByPath(value);
      if (remote) return { ...remote, label: remote.name };

      await vscode.window.showWarningMessage(`Cannot find project with path '${value}'`);
      return undefined;
    },
  );
}
