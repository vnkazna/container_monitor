import * as vscode from 'vscode';
import { GitLabNewService, GraphQLSnippet, GraphQLBlob } from '../gitlab/gitlab_new_service';
import { createGitService } from '../git_service_factory';
import { getCurrentWorkspaceFolderOrSelectOne } from '../services/workspace_service';

const pickSnippet = async (snippets: GraphQLSnippet[]) => {
  const quickPickItems = snippets.map(s => ({
    label: s.title,
    description: s.description,
    detail: s.blobs.nodes.map(blob => blob.name).join(','),
    original: s,
  }));
  return vscode.window.showQuickPick(quickPickItems);
};

const pickBlob = async (blobs: GraphQLBlob[]) => {
  const quickPickItems = blobs.map(b => ({
    label: b.name,
    original: b,
  }));
  const result = await vscode.window.showQuickPick(quickPickItems);
  return result?.original;
};

export const insertSnippet = async (): Promise<void> => {
  if (!vscode.window.activeTextEditor) {
    vscode.window.showInformationMessage('There is no open file.');
    return;
  }
  const workspaceFolder = await getCurrentWorkspaceFolderOrSelectOne();
  if (!workspaceFolder) {
    return;
  }
  const gitService = createGitService(workspaceFolder);
  const instanceUrl = await gitService.fetchCurrentInstanceUrl();
  const gitLabService = new GitLabNewService(instanceUrl);
  const remote = await gitService.fetchGitRemote();
  if (!remote) {
    throw new Error('Could not get parsed remote for your workspace');
  }
  const snippets = await gitLabService.getSnippets(`${remote.namespace}/${remote.project}`);
  if (snippets.length === 0) {
    vscode.window.showInformationMessage('There are no project snippets.');
    return;
  }

  const result = await pickSnippet(snippets);
  if (!result) {
    return;
  }
  const blobs = result.original.blobs.nodes;
  const blob = blobs.length > 1 ? await pickBlob(blobs) : blobs[0];
  if (!blob) {
    return;
  }
  const snippet = await gitLabService.getSnippetContent(result.original, blob);
  const editor = vscode.window.activeTextEditor;
  await editor.edit(editBuilder => {
    editBuilder.insert(editor.selection.start, snippet);
  });
};
