import * as vscode from 'vscode';
import { fromReviewUri } from './review_uri';
import { log } from '../log';
import { gitlabProjectRepository } from '../gitlab/gitlab_project_repository';
import { getGitLabService } from '../gitlab/get_gitlab_service';

export class ApiContentProvider implements vscode.TextDocumentContentProvider {
  // eslint-disable-next-line class-methods-use-this
  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const params = fromReviewUri(uri);
    if (!params.path || !params.commit) return '';

    const projectInRepository =
      await gitlabProjectRepository.getSelectedOrDefaultForRepositoryLegacy(params.repositoryRoot);
    const service = getGitLabService(projectInRepository);
    try {
      return await service.getFileContent(params.path, params.commit, params.projectId);
    } catch (e) {
      log.error(e);
      throw e;
    }
  }
}
