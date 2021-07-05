import * as vscode from 'vscode';
import * as assert from 'assert';
import * as gitLabService from '../gitlab_service';
import * as openers from '../openers';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { VISIBILITY_OPTIONS } from './create_snippet';

const getSnippetPatchDescription = (
  branch: string,
  commit: string,
  patchFileName: string,
): string => `
This snippet contains suggested changes for branch ${branch} (commit: ${commit}).

Apply this snippet:

- In VS Code with the GitLab Workflow extension installed:
  - Run \`GitLab: Apply snippet patch\` and select this snippet
- Using the \`git\` command:
  - Download the \`${patchFileName}\` file to your project folder
  - In your project folder, run

    ~~~sh
    git apply '${patchFileName}'
    ~~~

*This snippet was created with the [GitLab Workflow VS Code extension](https://marketplace.visualstudio.com/items?itemName=GitLab.gitlab-workflow).*
`;

export const createSnippetPatch = async (): Promise<void> => {
  const repository = await gitExtensionWrapper.getActiveRepositoryOrSelectOne();
  assert(repository);
  assert(repository.lastCommitSha);
  const patch = await repository.diff();
  const name = await vscode.window.showInputBox({
    placeHolder: 'patch name',
    prompt:
      'The name is used as the snippet title and also as the filename (with .patch appended).',
  });
  if (!name) return;
  const visibility = await vscode.window.showQuickPick(VISIBILITY_OPTIONS);
  if (!visibility) return;

  const project = await repository.getProject();
  assert(project);
  const patchFileName = `${name}.patch`;
  const data = {
    id: project.restId,
    title: `patch: ${name}`,
    description: getSnippetPatchDescription(
      await repository.getTrackingBranchName(),
      repository.lastCommitSha,
      patchFileName,
    ),
    file_name: patchFileName,
    visibility: visibility.type,
    content: patch,
  };

  const snippet = await gitLabService.createSnippet(repository.rootFsPath, data);

  await openers.openUrl(snippet.web_url);
};
