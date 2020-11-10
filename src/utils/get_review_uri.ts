import { Uri } from 'vscode';
import { REVIEW_URI_SCHEME } from '../constants';

export const getReviewUri = ({
  path,
  commit,
  workspace,
  version,
}: {
  path: string;
  commit: string;
  workspace: string;
  version: 'base' | 'head';
}): Uri =>
  Uri.parse(
    `${REVIEW_URI_SCHEME}://authority/${path}?commit=${commit}&workspace=${encodeURIComponent(
      workspace,
    )}&version=${version}`,
  );
