import * as vscode from 'vscode';
import { FF_COMMENTING_RANGES, REVIEW_URI_SCHEME } from '../constants';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';
import { fromReviewUri } from './review_uri';

const removeLeadingSlash = (path: string): string => path.replace(/^\//, '');

/**
 * This method returns line number where in the text document given hunk starts.
 * Each hunk header contains information about where the hunk starts for old and new version.
 * `@@ -38,9 +36,8 @@` reads: hunk starts at line 38 of the old version and 36 of the new version.
 */
const getHunkStartingLine = (headerString = ''): number | null => {
  const headerMatch = headerString.match(/@@ -\d+,\d+ \+(\d+),\d+ @@/);
  return headerMatch && parseInt(headerMatch[1], 10);
};

const getHunks = (diff: string): string[] => {
  return diff
    .replace(/^@@/, '') // remove first @@ because we'll remove all the other @@ by splitting
    .split('\n@@')
    .map(h => `@@${h}`); // prepend the removed @@ to all hunks
};

const getAddedLineNumbers = (hunk: string): number[] => {
  const hunkLines = hunk.split('\n');
  const hunkStartingLine = getHunkStartingLine(hunkLines[0]);
  if (!hunkStartingLine) return [];
  const noRemovedLines = hunkLines.slice(1, hunkLines.length).filter(l => !l.startsWith('-'));
  return noRemovedLines.reduce((addedLines: number[], l, i) => {
    if (l.startsWith('+')) {
      return [...addedLines, i + hunkStartingLine];
    }
    return addedLines;
  }, []);
};

export const getAddedLinesFromDiff = (diff: string): number[] => {
  const hunks = getHunks(diff);
  const changedLinesForHunks = hunks.map(h => getAddedLineNumbers(h));

  return changedLinesForHunks.reduce((acc, changedLines) => [...acc, ...changedLines], []);
};

export class CommentingRangeProvider implements vscode.CommentingRangeProvider {
  private mr: RestIssuable;

  private mrVersion: RestMrVersion;

  constructor(mr: RestIssuable, mrVersion: RestMrVersion) {
    this.mr = mr;
    this.mrVersion = mrVersion;
  }

  provideCommentingRanges(document: vscode.TextDocument): vscode.Range[] {
    if (!getExtensionConfiguration().featureFlags?.includes(FF_COMMENTING_RANGES)) return [];
    const { uri } = document;
    if (uri.scheme !== REVIEW_URI_SCHEME) return [];
    const params = fromReviewUri(uri);
    if (params.mrId !== this.mr.id || params.projectId !== this.mr.project_id || !params.path) {
      return [];
    }
    const oldFile = params.commit === this.mrVersion.base_commit_sha;
    if (oldFile) {
      return [
        new vscode.Range(new vscode.Position(0, 0), new vscode.Position(document.lineCount - 1, 0)),
      ];
    }
    const fileDiff = this.getNewFileDiff(params.path);
    if (!fileDiff) return [];
    const result = getAddedLinesFromDiff(fileDiff.diff);
    return result.map(
      l => new vscode.Range(new vscode.Position(l - 1, 0), new vscode.Position(l - 1, 0)),
    );
  }

  private getNewFileDiff(path: string): RestDiffFile | undefined {
    // VS Code Uri returns absolute path (leading slash) but GitLab uses relative paths (no leading slash)
    return this.mrVersion.diffs.find(d => d.new_path === removeLeadingSlash(path));
  }
}
