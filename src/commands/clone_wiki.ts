import * as vscode from 'vscode';
import { VS_COMMANDS } from '../command_names';
import { pickInstance } from '../gitlab/pick_instance';
import { pickProject } from '../gitlab/pick_project';

export async function cloneWiki(): Promise<void> {
  const instance = await pickInstance();
  if (!instance) {
    return;
  }

  const selectedSource = await pickProject(instance);
  if (!selectedSource) {
    return;
  }

  const selectedUrl = await vscode.window.showQuickPick(selectedSource.wikiUrl, {
    ignoreFocusOut: true,
    placeHolder: 'Select URL to clone from',
  });

  if (!selectedUrl) {
    return;
  }

  await vscode.commands.executeCommand(VS_COMMANDS.GIT_CLONE, selectedUrl);
}
