import { Uri } from 'vscode';
import { REVIEW_URI_SCHEME } from '../constants';

interface ReviewParams {
  path?: string;
  commit?: string;
  workspacePath: string;
  projectId: number;
}

export function toReviewUri({ path = '', commit, workspacePath, projectId }: ReviewParams): Uri {
  return Uri.file(path).with({
    scheme: REVIEW_URI_SCHEME,
    query: JSON.stringify({ commit, workspacePath, projectId }),
  });
}

export function fromReviewUri(uri: Uri): ReviewParams {
  const { commit, workspacePath, projectId } = JSON.parse(uri.query);
  return {
    path: uri.path || undefined,
    commit,
    workspacePath,
    projectId,
  };
}
