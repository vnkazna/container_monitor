import * as vscode from 'vscode';
import { VS_COMMANDS } from '../command_names';
import { remoteForProject } from '../gitlab/clone/gitlab_remote_source_provider';
import { GitLabService } from '../gitlab/gitlab_service';
import { pickInstance } from '../gitlab/pick_instance';
import { pickProject } from '../gitlab/pick_project';

export async function cloneWiki(): Promise<void> {
  const credentials = await pickInstance();
  if (!credentials) {
    return;
  }

  const project = await pickProject(new GitLabService(credentials));
  if (!project) {
    return;
  }

  const selectedUrl = await vscode.window.showQuickPick(remoteForProject(project).wikiUrl, {
    ignoreFocusOut: true,
    placeHolder: 'Select URL to clone from',
  });

  if (!selectedUrl) {
    return;
  }

  await vscode.commands.executeCommand(VS_COMMANDS.GIT_CLONE, selectedUrl);
}
