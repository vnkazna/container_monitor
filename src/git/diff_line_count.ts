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

export const getAddedLinesForFile = (mrVersion: RestMrVersion, newPath: string): number[] => {
  // VS Code Uri returns absolute path (leading slash) but GitLab uses relative paths (no leading slash)
  const diff = mrVersion.diffs.find(d => d.new_path === removeLeadingSlash(newPath));
  if (!diff) return [];
  const hunks = getHunks(diff.diff);
  const changedLinesForHunks = hunks.map(h => getAddedLineNumbers(h));

  return changedLinesForHunks.reduce((acc, changedLines) => [...acc, ...changedLines], []);
};
