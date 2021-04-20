import { Uri } from 'vscode';
import { REVIEW_URI_SCHEME } from '../constants';

export interface ReviewParams {
  path?: string;
  commit?: string;
  workspacePath: string;
  projectId: number;
  mrId: number;
}

export function toReviewUri({
  path = '',
  commit,
  workspacePath,
  projectId,
  mrId,
}: ReviewParams): Uri {
  const query = { commit, workspacePath, projectId, mrId };
  return Uri.file(path).with({
    scheme: REVIEW_URI_SCHEME,
    query: JSON.stringify(query, Object.keys(query).sort()),
  });
}

export function fromReviewUri(uri: Uri): ReviewParams {
  const { commit, workspacePath, projectId, mrId } = JSON.parse(uri.query);
  return {
    path: uri.path || undefined,
    commit,
    workspacePath,
    projectId,
    mrId,
  };
}
