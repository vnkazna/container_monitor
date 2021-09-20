import * as vscode from 'vscode';
import { handleError } from '../log';
import { showQuickPick } from './show_quickpick';

/**
 * QuickPickInitOptions is a subset of QuickPick and is used by `pickWithQuery`
 * to set properties on a new QuickPick. If there is a property you need that
 * has not been added, add it.
 */
export type QuickPickInitOptions<T extends vscode.QuickPickItem> = Pick<
  Partial<vscode.QuickPick<T>>,
  'ignoreFocusOut' | 'placeholder' | 'items'
>;

/**
 * Shows a quickpick, using the query function to update the list of items when
 * the user types.
 * @param quickpick the quickpick to show
 * @param queryfn a function that is used to update the items when the user
 * types
 * @returns combination of the picked option
 */
export async function pickWithQuery<T extends vscode.QuickPickItem>(
  init: QuickPickInitOptions<T>,
  queryfn: (query?: string) => Thenable<T[]>,
): Promise<T | undefined> {
  const pick = vscode.window.createQuickPick<T>();
  Object.assign(pick, init);

  async function getItems(query?: string) {
    try {
      pick.busy = true;
      pick.items = await queryfn(query);
    } catch (e) {
      handleError(e);
    } finally {
      pick.busy = false;
    }
  }

  pick.onDidChangeValue(getItems);

  // We only need the result from the quick pick, but the promise needs to be
  // awaited to avoid leaking errors
  const [, picked] = await Promise.all([getItems(), showQuickPick(pick)]);
  return picked;
}
