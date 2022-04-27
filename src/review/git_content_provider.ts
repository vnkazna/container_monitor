import * as vscode from 'vscode';
import { fromReviewUri } from './review_uri';
import { ApiContentProvider } from './api_content_provider';
import { gitlabProjectRepository } from '../gitlab/gitlab_project_repository';
import { getFileContent } from '../git/get_file_content';

const provideApiContentAsFallback = (uri: vscode.Uri) =>
  new ApiContentProvider().provideTextDocumentContent(uri);

export class GitContentProvider implements vscode.TextDocumentContentProvider {
  // eslint-disable-next-line class-methods-use-this
  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const params = fromReviewUri(uri);
    if (!params.path || !params.commit) return '';
    const projectInRepository =
      await gitlabProjectRepository.getSelectedOrDefaultForRepositoryLegacy(params.repositoryRoot);
    const result = await getFileContent(
      projectInRepository.pointer.repository.rawRepository,
      params.path,
      params.commit,
    );
    return result || provideApiContentAsFallback(uri);
  }
}
