import { Uri } from 'vscode';
import { REVIEW_URI_SCHEME } from '../constants';

export const getReviewUri = ({
  path,
  commit,
  workspace,
}: {
  path: string;
  commit: string;
  workspace: string;
}): Uri =>
  Uri.parse(
    `${REVIEW_URI_SCHEME}://authority/${path}?commit=${commit}&workspace=${encodeURIComponent(
      workspace,
    )}`,
  );
