import * as vscode from 'vscode';
import * as path from 'path';
import { REMOTE_URI_SCHEME } from '../constants';
import { GitLabRemoteFileSystem } from '../remotefs/gitlab_remote_file_system';
import { pickInstance } from '../gitlab/pick_instance';
import { pickProject } from '../gitlab/pick_project';
import { pickGitRef } from '../gitlab/pick_git_ref';

// eslint-disable-next-line no-shadow
enum Action {
  None,
  Replace,
  AddRoot,
  NewWindow,
}

async function openUrl(uri: vscode.Uri, action: Action) {
  await GitLabRemoteFileSystem.parseUri(uri); // ensure the URI is a valid gitlab-remote URI

  switch (action) {
    case Action.Replace:
      await vscode.commands.executeCommand('vscode.openFolder', uri, false);
      break;

    case Action.NewWindow:
      await vscode.commands.executeCommand('vscode.openFolder', uri, true);
      break;

    case Action.AddRoot:
      vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders?.length || 0, 0, {
        uri,
      });
      break;

    default:
      throw new Error('Invalid action');
  }
}

async function enterUrl(action: Action) {
  const uriStr = await vscode.window.showInputBox({
    prompt: 'gitlab-remote://{instance}/{label}?project={id}&ref={branch}',
    ignoreFocusOut: true,
  });
  if (!uriStr) return;

  await openUrl(vscode.Uri.parse(uriStr), action);
}

async function chooseProject(action: Action) {
  const instance = await pickInstance();
  if (!instance) return;

  const remote = await pickProject(instance);
  if (!remote) return;

  const ref = await pickGitRef(instance, remote.project.restId);
  if (!ref) return;

  const label = await vscode.window.showInputBox({
    value: remote.project.name,
    prompt: 'GitLab remote folder label',
    ignoreFocusOut: true,
    validateInput: GitLabRemoteFileSystem.validateLabel,
  });
  if (!label) return;

  const instanceUri = vscode.Uri.parse(instance);
  const remoteUri = vscode.Uri.joinPath(instanceUri, label).with({
    scheme: REMOTE_URI_SCHEME,
    query: `project=${remote.project.restId}&ref=${ref.name}`,
  });
  await openUrl(remoteUri, action);
}

export async function openRepository(): Promise<void> {
  const { action } =
    (await vscode.window.showQuickPick([
      { label: '$(window) Open in current window', action: Action.Replace },
      { label: '$(empty-window) Open in new window', action: Action.NewWindow },
      { label: '$(root-folder) Add to workspace', action: Action.AddRoot },
    ])) || {};
  if (!action) return;

  const { next } =
    (await vscode.window.showQuickPick([
      { label: '$(repo) Choose a project', next: chooseProject },
      { label: '$(globe) Enter gitlab-remote URL', next: enterUrl },
    ])) || {};
  if (!next) return;

  await next(action);
}
