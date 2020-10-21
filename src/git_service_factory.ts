import * as vscode from 'vscode';
import { GitService } from './git_service';
import { tokenService } from './services/token_service';
import { log } from './log';

export function createGitService(workspaceFolder: string): GitService {
  const { instanceUrl, remoteName, pipelineGitRemoteName } = vscode.workspace.getConfiguration(
    'gitlab',
  );
  // the getConfiguration() returns null for missing attributes, we need to convert them to
  // undefined so that we can use optional properties and default function parameters
  return new GitService({
    workspaceFolder,
    instanceUrl: instanceUrl || undefined,
    remoteName: remoteName || undefined,
    pipelineGitRemoteName: pipelineGitRemoteName || undefined,
    tokenService,
    log,
  });
}
