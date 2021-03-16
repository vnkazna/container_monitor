import * as assert from 'assert';

const getHunks = (diff: string): string[][] => {
  return diff.split('\n').reduce((acc: string[][], line) => {
    if (line.startsWith('@@')) {
      return [...acc, [line]];
    }
    assert(acc.length, "the diff doesn't have any hunks");
    return [...acc.slice(0, acc.length - 1), [...acc[acc.length - 1], line]];
  }, []);
};

const getAddedLineNumbers = (hunk: string[]): number[] => {
  const firstLine = parseInt(hunk[0].match(/@@ -\d+,\d+ \+(\d+),\d+ @@/)![1], 10);
  const noRemovedLines = hunk.slice(1, hunk.length).filter(l => !l.startsWith('-'));
  return noRemovedLines.reduce((acc: number[], l, i) => {
    if (l.startsWith('+')) {
      return [...acc, i + firstLine];
    }
    return acc;
  }, []);
};

const getRemovedLineNumbers = (hunk: string[]): number[] => {
  const firstLine = parseInt(hunk[0].match(/@@ -(\d+),\d+ \+\d+,\d+ @@/)![1], 10);
  const noAddedLines = hunk.slice(1, hunk.length).filter(l => !l.startsWith('+'));
  return noAddedLines.reduce((acc: number[], l, i) => {
    if (l.startsWith('-')) {
      return [...acc, i + firstLine];
    }
    return acc;
  }, []);
};

/**
 * List of line numbers where code has been added
 *
 * ```
 * @@ -0,0 +1,3 @@
 * +export class NewFile{
 * +    private property: string;
 * +}
 * ```
 *
 * would return [1,2,3]
 *
 */
export const getAddedLinesFromDiff = (diff: string): number[] => {
  const hunks = getHunks(diff);
  const arraysOfChangedLines = hunks.map(h => getAddedLineNumbers(h));

  // @ts-ignore
  return [].concat.apply([], arraysOfChangedLines);
};

export const getRemovedLinesFromDiff = (diff: string): number[] => {
  const hunks = getHunks(diff);
  const arraysOfChangedLines = hunks.map(h => getRemovedLineNumbers(h));

  // @ts-ignore
  return [].concat.apply([], arraysOfChangedLines);
};

const removeLeadingSlash = (path: string): string => path.replace(/^\//, '');

export const getFileDiff = (version: RestMrVersion, isOldFile: boolean, path: string) => {
  return version.diffs.find(d => {
    const diffPath = isOldFile ? d.old_path : d.new_path;
    return diffPath === removeLeadingSlash(path!);
  });
};
