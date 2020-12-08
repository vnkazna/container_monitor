import { TreeItem, Uri } from 'vscode';
import { posix as path } from 'path';
import { toReviewUri } from '../../review/review_uri';
import { PROGRAMMATIC_COMMANDS, VS_COMMANDS } from '../../command_names';

const getChangeTypeIndicator = (diff: RestDiffFile): string => {
  if (diff.new_file) return '[added] ';
  if (diff.deleted_file) return '[deleted] ';
  if (diff.renamed_file) return '[renamed] ';
  return '';
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

  project: VsProject;

  file: RestDiffFile;

  constructor(mr: RestIssuable, mrVersion: RestMrVersion, file: RestDiffFile, project: VsProject) {
    super(Uri.file(file.new_path));
    // TODO add FileDecorationProvider once it is available in the 1.52 https://github.com/microsoft/vscode/issues/54938
    this.description = `${getChangeTypeIndicator(file)}${path.dirname(`/${file.new_path}`)}`;
    this.mr = mr;
    this.mrVersion = mrVersion;
    this.project = project;
    this.file = file;

    if (looksLikeImage(file.old_path) || looksLikeImage(file.new_path)) {
      this.command = {
        title: 'Images are not supported',
        command: PROGRAMMATIC_COMMANDS.NO_IMAGE_REVIEW,
      };
      return;
    }

    const emptyFileUri = toReviewUri({ workspacePath: project.uri, projectId: mr.project_id });
    const baseFileUri = file.new_file
      ? emptyFileUri
      : toReviewUri({
          path: file.old_path,
          commit: mrVersion.base_commit_sha,
          workspacePath: project.uri,
          projectId: mr.project_id,
        });
    const headFileUri = file.deleted_file
      ? emptyFileUri
      : toReviewUri({
          path: file.new_path,
          commit: mrVersion.head_commit_sha,
          workspacePath: project.uri,
          projectId: mr.project_id,
        });

    this.command = {
      title: 'Show changes',
      command: VS_COMMANDS.DIFF,
      arguments: [baseFileUri, headFileUri, `${path.basename(file.new_path)} (!${mr.iid})`],
    };
  }
}
