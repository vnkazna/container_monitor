import * as vscode from 'vscode';
import { fromReviewUri } from './review_uri';
import { GitLabNewService } from '../gitlab/gitlab_new_service';
import { logError } from '../log';
import { createGitService } from '../git_service_factory';

export class ApiContentProvider implements vscode.TextDocumentContentProvider {
  // eslint-disable-next-line class-methods-use-this
  async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken,
  ): Promise<string> {
    const params = fromReviewUri(uri);
    if (!params.path || !params.commit) return '';

    const instanceUrl = await createGitService(params.workspacePath).fetchCurrentInstanceUrl();
    const service = new GitLabNewService(instanceUrl);
    try {
      return service.getFileContent(params.path, params.commit, params.projectId);
    } catch (e) {
      logError(e);
      throw e;
    }
  }
}
