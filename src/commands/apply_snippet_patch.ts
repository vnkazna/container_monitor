import * as vscode from 'vscode';
import * as temp from 'temp';
import assert from 'assert';
import { promises as fs } from 'fs';
import { pickSnippet } from './insert_snippet';
import { PATCH_FILE_SUFFIX } from '../constants';
import { GqlBlob, GqlSnippet } from '../gitlab/graphql/get_snippets';
import { ProjectCommand } from './run_with_valid_project';

const FETCHING_PROJECT_SNIPPETS = 'Fetching all project snippets.';
export const NO_PATCH_SNIPPETS_MESSAGE =
  'There are no patch snippets (patch snippet must contain a file which name ends with ".patch").';

const getFirstPatchBlob = (snippet: GqlSnippet): GqlBlob | undefined =>
  snippet.blobs.nodes.find(b => b.name.endsWith(PATCH_FILE_SUFFIX));

export const applySnippetPatch: ProjectCommand = async repository => {
  const { remote } = repository;
  const snippets = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: FETCHING_PROJECT_SNIPPETS },
    () => repository.getGitLabService().getSnippets(`${remote.namespace}/${remote.project}`),
  );
  const patchSnippets = snippets.filter(s => getFirstPatchBlob(s));
  if (patchSnippets.length === 0) {
    await vscode.window.showInformationMessage(NO_PATCH_SNIPPETS_MESSAGE);
    return;
  }

  const result = await pickSnippet(patchSnippets);
  if (!result) {
    return;
  }
  const blob = getFirstPatchBlob(result.original);
  assert(blob, 'blob should be here, we filtered out all snippets without patch blob');
  const snippet = await repository.getGitLabService().getSnippetContent(result.original, blob);
  const tmpFilePath = temp.path({ suffix: PATCH_FILE_SUFFIX });
  await fs.writeFile(tmpFilePath, snippet);

  await repository.apply(tmpFilePath);

  await fs.unlink(tmpFilePath);
};
