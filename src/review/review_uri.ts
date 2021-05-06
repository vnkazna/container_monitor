import { Uri } from 'vscode';
import { REVIEW_URI_SCHEME } from '../constants';

export interface ReviewParams {
  path?: string;
  commit?: string;
  repositoryRoot: string;
  projectId: number;
  mrId: number;
}

export function toReviewUri({
  path = '',
  commit,
  repositoryRoot,
  projectId,
  mrId,
}: ReviewParams): Uri {
  const query = { commit, repositoryRoot, projectId, mrId };
  return Uri.file(path).with({
    scheme: REVIEW_URI_SCHEME,
    query: JSON.stringify(query, Object.keys(query).sort()),
  });
}

export function fromReviewUri(uri: Uri): ReviewParams {
  const { commit, repositoryRoot, projectId, mrId } = JSON.parse(uri.query);
  return {
    path: uri.path || undefined,
    commit,
    repositoryRoot,
    projectId,
    mrId,
  };
}
