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
