import * as vscode from 'vscode';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { GqlBlob, GqlSnippet } from '../gitlab/graphql/get_snippets';
import { createGitService, createGitLabNewService } from '../service_factory';

const pickSnippet = async (snippets: GqlSnippet[]) => {
  const quickPickItems = snippets.map(s => ({
    label: s.title,
    description: s.description,
    detail: s.blobs.nodes.map(blob => blob.name).join(','),
    original: s,
  }));
  return vscode.window.showQuickPick(quickPickItems);
};

const pickBlob = async (blobs: GqlBlob[]) => {
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
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  if (!repository) {
    return;
  }
  const gitService = createGitService(repository.rootFsPath);
  const gitLabService = await createGitLabNewService(repository.rootFsPath);
  const remote = await gitService.fetchGitRemote();
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
