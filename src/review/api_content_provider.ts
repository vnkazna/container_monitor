import * as vscode from 'vscode';
import { fromReviewUri } from './review_uri';
import { logError } from '../log';
import { createGitLabNewService } from '../service_factory';

export class ApiContentProvider implements vscode.TextDocumentContentProvider {
  // eslint-disable-next-line class-methods-use-this
  async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken,
  ): Promise<string> {
    const params = fromReviewUri(uri);
    if (!params.path || !params.commit) return '';

    const service = await createGitLabNewService(params.repositoryRoot);
    try {
      return await service.getFileContent(params.path, params.commit, params.projectId);
    } catch (e) {
      logError(e);
      throw e;
    }
  }
}
