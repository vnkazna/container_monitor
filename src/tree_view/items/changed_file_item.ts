import * as vscode from 'vscode';
import { posix as path } from 'path';
import { toReviewUri, ReviewParams } from '../../review/review_uri';
import { PROGRAMMATIC_COMMANDS, VS_COMMANDS } from '../../command_names';
import {
  ADDED,
  DELETED,
  RENAMED,
  MODIFIED,
  CHANGE_TYPE_QUERY_KEY,
  HAS_COMMENTS_QUERY_KEY,
} from '../../constants';

export type ChangeType = typeof ADDED | typeof DELETED | typeof RENAMED | typeof MODIFIED;
export type HasCommentsFn = (reviewUri: vscode.Uri) => boolean;

const getChangeType = (file: RestDiffFile): ChangeType => {
  if (file.new_file) return ADDED;
  if (file.deleted_file) return DELETED;
  if (file.renamed_file) return RENAMED;
  return MODIFIED;
};

// Common image types https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Image_types
const imageExtensions = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.tiff',
  '.bmp',
  '.avif',
  '.apng',
];
const looksLikeImage = (filePath: string) =>
  imageExtensions.includes(path.extname(filePath).toLowerCase());

const getBaseAndHeadUri = (
  mr: RestMr,
  mrVersion: RestMrVersion,
  file: RestDiffFile,
  repositoryPath: string,
) => {
  const commonParams: ReviewParams = {
    repositoryRoot: repositoryPath,
    projectId: mr.project_id,
    mrId: mr.id,
  };
  const emptyFileUri = toReviewUri(commonParams);
  const baseFileUri = file.new_file
    ? emptyFileUri
    : toReviewUri({
        ...commonParams,
        path: file.old_path,
        commit: mrVersion.base_commit_sha,
      });
  const headFileUri = file.deleted_file
    ? emptyFileUri
    : toReviewUri({
        ...commonParams,
        path: file.new_path,
        commit: mrVersion.head_commit_sha,
      });
  return { baseFileUri, headFileUri };
};

export class ChangedFileItem extends vscode.TreeItem {
  constructor(
    mr: RestMr,
    mrVersion: RestMrVersion,
    file: RestDiffFile,
    repositoryPath: string,
    hasComment: HasCommentsFn,
  ) {
    super(vscode.Uri.file(file.new_path));
    this.description = path.dirname(`/${file.new_path}`).split('/').slice(1).join('/');
    const { baseFileUri, headFileUri } = getBaseAndHeadUri(mr, mrVersion, file, repositoryPath);
    const hasComments = hasComment(baseFileUri) || hasComment(headFileUri);
    const query = new URLSearchParams([
      [CHANGE_TYPE_QUERY_KEY, getChangeType(file)],
      [HAS_COMMENTS_QUERY_KEY, String(hasComments)],
    ]).toString();
    this.resourceUri = this.resourceUri?.with({ query });
    if (looksLikeImage(file.old_path) || looksLikeImage(file.new_path)) {
      this.command = {
        title: 'Images are not supported',
        command: PROGRAMMATIC_COMMANDS.NO_IMAGE_REVIEW,
      };
      return;
    }
    this.command = {
      title: 'Show changes',
      command: VS_COMMANDS.DIFF,
      arguments: [baseFileUri, headFileUri, `${path.basename(file.new_path)} (!${mr.iid})`],
    };
  }
}
