import * as vscode from 'vscode';
import { fromReviewUri } from './review_uri';
import { logError } from '../log';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';

export class ApiContentProvider implements vscode.TextDocumentContentProvider {
  // eslint-disable-next-line class-methods-use-this
  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const params = fromReviewUri(uri);
    if (!params.path || !params.commit) return '';

    const repository = gitExtensionWrapper.getRepository(params.repositoryRoot);
    const service = repository.getGitLabService();
    try {
      return await service.getFileContent(params.path, params.commit, params.projectId);
    } catch (e) {
      logError(e);
      throw e;
    }
  }
}
