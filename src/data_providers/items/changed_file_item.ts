import { TreeItem, Uri } from 'vscode';
import { posix as path } from 'path';
import { toReviewUri, ReviewParams } from '../../review/review_uri';
import { PROGRAMMATIC_COMMANDS, VS_COMMANDS } from '../../command_names';
import { ADDED, DELETED, RENAMED, MODIFIED } from '../../constants';

export type ChangeType = typeof ADDED | typeof DELETED | typeof RENAMED | typeof MODIFIED;

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

export class ChangedFileItem extends TreeItem {
  mr: RestIssuable;

  mrVersion: RestMrVersion;

  workspace: GitLabWorkspace;

  file: RestDiffFile;

  constructor(
    mr: RestIssuable,
    mrVersion: RestMrVersion,
    file: RestDiffFile,
    workspace: GitLabWorkspace,
  ) {
    const changeType = getChangeType(file);
    const query = new URLSearchParams([['changeType', changeType]]).toString();
    super(Uri.file(file.new_path).with({ query }));
    this.description = path
      .dirname(`/${file.new_path}`)
      .split('/')
      .slice(1)
      .join('/');
    this.mr = mr;
    this.mrVersion = mrVersion;
    this.workspace = workspace;
    this.file = file;

    if (looksLikeImage(file.old_path) || looksLikeImage(file.new_path)) {
      this.command = {
        title: 'Images are not supported',
        command: PROGRAMMATIC_COMMANDS.NO_IMAGE_REVIEW,
      };
      return;
    }
    const commonParams: ReviewParams = {
      repositoryRoot: workspace.uri,
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

    this.command = {
      title: 'Show changes',
      command: VS_COMMANDS.DIFF,
      arguments: [baseFileUri, headFileUri, `${path.basename(file.new_path)} (!${mr.iid})`],
    };
  }
}
