import * as assert from 'assert';
import { DiffFilePath, findFileInDiffs } from '../utils/find_file_in_diffs';

// these helper functions are simplified version of the same lodash functions
const range = (start: number, end: number) => [...Array(end - start).keys()].map(n => n + start);
const flatten = <T>(a: T[][]): T[] => a.reduce((acc, nested) => [...acc, ...nested], []);
const last = <T>(a: T[]): T => a[a.length - 1];
const first = <T>(a: T[]): T => a[0];

/**
 * This method returns line number where in the text document given hunk starts.
 * Each hunk header contains information about where the hunk starts for old and new version.
 * `@@ -38,9 +36,8 @@` reads: hunk starts at line 38 of the old version and 36 of the new version.
 */
const getHunkStartingLine = (headerString = ''): { oldStart: number; newStart: number } | null => {
  const headerMatch = headerString.match(/@@ -(\d+),\d+ \+(\d+),\d+ @@/);
  return (
    headerMatch && {
      oldStart: parseInt(headerMatch[1], 10),
      newStart: parseInt(headerMatch[2], 10),
    }
  );
};

const getRawHunks = (diff: string): string[] => {
  return diff
    .replace(/^@@/, '') // remove first @@ because we'll remove all the other @@ by splitting
    .split('\n@@')
    .map(h => `@@${h}`); // prepend the removed @@ to all hunks
};

const REMOVED = 'REMOVED';
const ADDED = 'ADDED';
const UNCHANGED = 'UNCHANGED';

type RemovedLine = { type: typeof REMOVED; oldLine: number };
type AddedLine = { type: typeof ADDED; newLine: number };
type UnchangedLine = { type: typeof UNCHANGED; oldLine: number; newLine: number };
type HunkLine = RemovedLine | AddedLine | UnchangedLine;

/** Converts lines in the text hunk into data structures that represent type of the change and affected lines */
const parseHunk = (hunk: string): HunkLine[] => {
  const [headerLine, ...remainingLines] = hunk.split('\n');
  const header = getHunkStartingLine(headerLine);
  assert(header);
  const result = remainingLines
    .filter(l => l) // no empty lines
    .reduce(
      ({ oldIndex, newIndex, lines }, line) => {
        const prefix = line[0];
        switch (prefix) {
          case '-':
            return {
              oldIndex: oldIndex + 1,
              newIndex,
              lines: [...lines, { type: REMOVED, oldLine: oldIndex } as const],
            };
          case '+':
            return {
              oldIndex,
              newIndex: newIndex + 1,
              lines: [...lines, { type: ADDED, newLine: newIndex } as const],
            };
          case ' ':
            return {
              oldIndex: oldIndex + 1,
              newIndex: newIndex + 1,
              lines: [...lines, { type: UNCHANGED, oldLine: oldIndex, newLine: newIndex } as const],
            };
          default:
            throw new Error(`Unexpected line prefix in a hunk. Hunk: ${hunk}, prefix ${prefix}`);
        }
      },
      {
        oldIndex: header.oldStart,
        newIndex: header.newStart,
        lines: [] as HunkLine[],
      },
    );
  return result.lines;
};

const getHunksForFile = (mrVersion: RestMrVersion, path: DiffFilePath): HunkLine[][] => {
  const diff = findFileInDiffs(mrVersion.diffs, path);
  if (!diff) return [];
  return getRawHunks(diff.diff).map(parseHunk);
};

export const getAddedLinesForFile = (mrVersion: RestMrVersion, newPath: string): number[] => {
  const hunkLines = flatten(getHunksForFile(mrVersion, { newPath }));
  return hunkLines.filter((hl): hl is AddedLine => hl.type === ADDED).map(hl => hl.newLine);
};

const newLineOffset = (line: UnchangedLine) => line.newLine - line.oldLine;

const createUnchangedLinesBetweenHunks = (
  previousHunkLast: HunkLine,
  nextHunkFirst: HunkLine,
): HunkLine[] => {
  assert(previousHunkLast.type === UNCHANGED && nextHunkFirst.type === UNCHANGED);
  assert(newLineOffset(previousHunkLast) === newLineOffset(nextHunkFirst));
  return range(previousHunkLast.oldLine + 1, nextHunkFirst.oldLine).map(oldLine => ({
    type: UNCHANGED,
    oldLine,
    newLine: oldLine + newLineOffset(previousHunkLast),
  }));
};

const connectHunks = (parsedHunks: HunkLine[][]): HunkLine[] =>
  parsedHunks.length === 0
    ? []
    : parsedHunks.reduce((acc, hunk) => [
        ...acc,
        ...createUnchangedLinesBetweenHunks(last(acc), first(hunk)),
        ...hunk,
      ]);

export const getUnchangedLines = (mrVersion: RestMrVersion, oldPath: string): UnchangedLine[] =>
  connectHunks(getHunksForFile(mrVersion, { oldPath })).filter(
    (l): l is UnchangedLine => l.type === UNCHANGED,
  );
