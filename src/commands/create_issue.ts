import * as vscode from 'vscode';
import * as temp from 'temp';
import { promises as fs } from 'fs';
import { getCurrentWorkspaceFolderOrSelectOne } from '../services/workspace_service';
import { createGitLabNewService, createGitService } from '../service_factory';

const issueComment = `<!-- This is a temporary file for your new issue description. -->
<!-- The issue is going to be created when you save this file. -->
<!-- The first H1 Markdown heading is going to be used as the issue title. -->
<!-- Everything after this line is going to be in the issue description. -->
`;

const lastLine = '<!-- Everything after this line is going to be in the issue description. -->';

const processIssue = (content: string): string => {
  const lines = content.split('\n');
  const lastLineIndex = lines.indexOf(lastLine);
  return lines.slice(lastLineIndex + 1, lines.length).join('\n');
};

const getIssueTitle = (issueText: string): string => {
  const firstHeading = issueText.split('\n').find(line => line.match(/^\s*# \S+/));
  if (!firstHeading) {
    throw new Error('The issue must have an H1 heading to be used as issue title');
  }
  const [, title] = /^\s*# (.+)/.exec(firstHeading)!;
  return title;
};

export const createIssue = async () => {
  vscode.window.showInformationMessage('create issue');
  const file: temp.OpenFile = await new Promise((res, rej) =>
    temp.open({ suffix: '--new-issue.md' }, (err, result) => {
      if (err) rej(err);
      res(result);
    }),
  );
  await fs.writeFile(file.path, issueComment);
  const uri = vscode.Uri.parse(file.path);
  await vscode.commands.executeCommand('vscode.open', uri);
  await vscode.commands.executeCommand('cursorBottom');
  const disposable = vscode.workspace.onDidSaveTextDocument(async textDocument => {
    if (textDocument.uri.fsPath === uri.fsPath) {
      const issueText = processIssue(textDocument.getText());
      const title = getIssueTitle(issueText);
      const workspaceFolder = await getCurrentWorkspaceFolderOrSelectOne();
      const gitService = createGitService(workspaceFolder!);
      const gitlabService = await createGitLabNewService(workspaceFolder!);
      const remote = await gitService.fetchGitRemote();
      const project = await gitlabService.getProject(`${remote.namespace}/${remote.project}`);
      const result = await gitlabService.createIssue(project!.restId, title, issueText);
      await fs.unlink(uri.fsPath);
      const choice = await vscode.window.showInformationMessage(
        `Issue "${title}" has been created`,
        'Open on the Web',
      );
      if (choice === 'Open on the Web') {
        await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(result.web_url));
      }
      disposable.dispose();
    }
  });
};
