import * as vscode from 'vscode';
import { fromReviewUri } from './review_uri';
import { createGitService } from '../service_factory';
import { ApiContentProvider } from './api_content_provider';

const provideApiContentAsFallback = (uri: vscode.Uri, token: vscode.CancellationToken) =>
  new ApiContentProvider().provideTextDocumentContent(uri, token);

export class GitContentProvider implements vscode.TextDocumentContentProvider {
  // eslint-disable-next-line class-methods-use-this
  async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken,
  ): Promise<string> {
    const params = fromReviewUri(uri);
    if (!params.path || !params.commit) return '';
    const service = await createGitService(params.workspacePath);
    const result = await service.getFileContent(params.path, params.commit);
    return result || provideApiContentAsFallback(uri, token);
  }
}
