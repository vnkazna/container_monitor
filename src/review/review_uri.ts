import { Uri } from 'vscode';
import { REVIEW_URI_SCHEME } from '../constants';

export interface MrCommentPayload {
  baseSha: string;
  headSha: string;
  startSha: string;
  oldPath: string;
  newPath: string;
}

export interface ReviewParams {
  path?: string;
  commit?: string;
  workspacePath: string;
  projectId: number;
  mrId: number;
  mrCommentPayload: MrCommentPayload;
}

export function toReviewUri({
  path = '',
  commit,
  workspacePath,
  projectId,
  mrId,
  mrCommentPayload,
}: ReviewParams): Uri {
  const { baseSha, headSha, startSha, oldPath, newPath } = mrCommentPayload;
  // the query needs to be flat object (no nested objects) so we can guarantee the key order during serialization
  const query: Record<string, string | number | undefined> = {
    commit,
    workspacePath,
    projectId,
    mrId,
    baseSha,
    headSha,
    startSha,
    oldPath,
    newPath,
  };
  return Uri.file(path).with({
    scheme: REVIEW_URI_SCHEME,
    query: JSON.stringify(query, Object.keys(query).sort()),
  });
}

export function fromReviewUri(uri: Uri): ReviewParams {
  const {
    commit,
    workspacePath,
    projectId,
    mrId,
    baseSha,
    headSha,
    startSha,
    oldPath,
    newPath,
  } = JSON.parse(uri.query);
  return {
    path: uri.path || undefined,
    commit,
    workspacePath,
    projectId,
    mrId,
    mrCommentPayload: {
      baseSha,
      headSha,
      startSha,
      oldPath,
      newPath,
    },
  };
}
