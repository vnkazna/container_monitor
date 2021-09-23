import * as vscode from 'vscode';
import { statusBar } from './status_bar';
import { currentBranchDataProvider } from './tree_view/current_branch_data_provider';

export class CurrentBranchRefresher {
  refreshTimer?: NodeJS.Timeout;

  init() {
    this.refreshTimer = setInterval(async () => {
      if (!vscode.window.state.focused) return;
      await CurrentBranchRefresher.refresh();
    }, 30000);
  }

  static async refresh() {
    await statusBar.refresh();
    await currentBranchDataProvider.refresh();
  }

  dispose() {
    global.clearInterval(this.refreshTimer!);
  }
}

export const currentBranchRefresher = new CurrentBranchRefresher();
