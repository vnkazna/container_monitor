import { diffFile, mrVersion } from '../test_utils/entities';
import {
  getAddedLinesForFile,
  getNewLineForOldUnchangedLine,
  getUnchangedLines,
} from './diff_line_count';

describe('diff_line_count', () => {
  const sevenNewLinesHunk = [
    '@@ -0,0 +1,7 @@',
    '+new file 2',
    '+',
    '+12',
    '+34',
    '+56',
    '+',
    '+,,,',
    '',
  ].join('\n');

  const hunkWithAddedAndRemovedLines = [
    `@@ -10,17 +10,17 @@`,
    ` //  This seems to be a result of only some next-line content triggering this issue and other content doesn't. `,
    ` //  If there is an empty line after, for example, this issue doesn't not occur`,
    ` `,
    `-function containingFunction(){`,
    `-    function subFunction(){`,
    `+function containingFunction(): void{`,
    `+    function subFunctionA(): void{`,
    `         console.log("Some Output");`,
    `     }`,
    `     // Issue is not present when the line after the function name and opening { is empty`,
    `-    function subFunction(){`,
    `+    function subFunctionB(): void{`,
    ` `,
    `         console.log("OPutput");`,
    `     }`,
    ` }`,
    ` `,
    `-function anotherFunction(){`,
    `+function anotherFunction(): void{`,
    `     console.log("Other Output");`,
    ` }`,
    ``,
  ].join('\n');

  const multiHunk = [
    `@@ -12,9 +12,7 @@`,
    ` 12`,
    ` 13`,
    ` 14`,
    `-15`,
    `-16`,
    `-17`,
    `+117`,
    ` 18`,
    ` 19`,
    ` 20`,
    `@@ -38,9 +36,8 @@`,
    ` 38`,
    ` 39`,
    ` 40`,
    `-41`,
    `-42`,
    `-43`,
    `+441`,
    `+443`,
    ` 44`,
    ` 45`,
    ` 46`,
    `@@ -75,7 +72,6 @@`,
    ` 75`,
    ` 76`,
    ` 77`,
    `-78`,
    ` 79`,
    ` 80`,
    ` 81`,
    `@@ -98,3 +94,5 @@`,
    ` 98`,
    ` 99`,
    ` 100`,
    `+101`,
    `+`,
  ].join('\n');

  // testing that we can parse diffs of files containing hunk headers
  const hunkWithHunkHeaders = [
    `@@ -2,7 +2,6 @@`,
    ` 2`,
    ` 3`,
    ` 4`,
    `-@@ -5,14 +1,20 @@`,
    ` 6`,
    ` 7`,
    ` 8`,
    `@@ -13,6 +12,7 @@`,
    ` 13`,
    ` 14`,
    ` @@ -29,3 +11,3 @@`,
    `+@@ -5,14 +1,20 @@`,
    ` 16`,
    ` 17`,
    ` 18`,
  ].join('\n');

  describe('getAddedLinesForFile', () => {
    it.each`
      hunkName                          | hunk                            | newLines
      ${'sevenNewLinesHunk'}            | ${sevenNewLinesHunk}            | ${[1, 2, 3, 4, 5, 6, 7]}
      ${'hunkWithAddedAndRemovedLines'} | ${hunkWithAddedAndRemovedLines} | ${[13, 14, 18, 24]}
      ${'multiHunk'}                    | ${multiHunk}                    | ${[15, 39, 40, 97, 98]}
      ${'hunkWithHunkHeaders'}          | ${hunkWithHunkHeaders}          | ${[15]}
    `('$hunkName gets correctly parsed', ({ hunk, newLines }) => {
      const testMrVersion = {
        ...mrVersion,
        diffs: [{ ...diffFile, diff: hunk }],
      };

      const ranges = getAddedLinesForFile(testMrVersion, diffFile.new_path);

      expect(ranges).toEqual(newLines);
    });

    it('returns empty array if invoked with invalid file name', () => {
      const ranges = getAddedLinesForFile(mrVersion, '/invalid/path');

      expect(ranges).toEqual([]);
    });
  });

  describe('getUnchangedLines', () => {
    const range = (start: number, end: number) =>
      [...Array(end - start).keys()].map(n => n + start);
    const shiftBy = (shift: number, oldLines: number[]) => oldLines.map(x => [x, x + shift]);

    it.each`
      hunkName                          | hunk                            | unchangedLines
      ${'sevenNewLinesHunk'}            | ${sevenNewLinesHunk}            | ${[]}
      ${'hunkWithAddedAndRemovedLines'} | ${hunkWithAddedAndRemovedLines} | ${[...shiftBy(0, [10, 11, 12, 15, 16, 17, 19, 20, 21, 22, 23, 25, 26])]}
      ${'multiHunk'}                    | ${multiHunk}                    | ${[...shiftBy(0, range(12, 15)), ...shiftBy(-2, range(18, 41)), ...shiftBy(-3, range(44, 78)), ...shiftBy(-4, range(79, 101))]}
      ${'hunkWithHunkHeaders'}          | ${hunkWithHunkHeaders}          | ${[...shiftBy(0, range(2, 5)), ...shiftBy(-1, range(6, 16)), ...shiftBy(0, range(16, 19))]}
    `('$hunkName gets correctly parsed', ({ hunk, unchangedLines }) => {
      const testMrVersion = {
        ...mrVersion,
        diffs: [{ ...diffFile, diff: hunk }],
      };

      const unchangedLineNumbers = getUnchangedLines(testMrVersion, diffFile.old_path).map(ul => [
        ul.oldLine,
        ul.newLine,
      ]);

      expect(unchangedLineNumbers).toEqual(unchangedLines);
    });

    it('returns empty array if invoked with invalid file name', () => {
      const ranges = getUnchangedLines(mrVersion, '/invalid/path');

      expect(ranges).toEqual([]);
    });
  });

  describe('getNewLineForOldUnchangedLine', () => {
    const testMrVersion = {
      ...mrVersion,
      diffs: [{ ...diffFile, diff: multiHunk }],
    };

    it('returns undefined when diff file is not found', () => {
      expect(getNewLineForOldUnchangedLine(testMrVersion, 'non/existent/path.js', 1)).toBe(
        undefined,
      );
    });

    it('returns undefined when the old line has been removed', () => {
      expect(getNewLineForOldUnchangedLine(testMrVersion, diffFile.old_path, 15)).toBe(undefined);
    });

    it('returns new line index that has been parsed from the diff hunks', () => {
      expect(getNewLineForOldUnchangedLine(testMrVersion, diffFile.old_path, 18)).toBe(16);
    });

    it('returns the same line number when the old line precedes all changes (all hunks)', () => {
      expect(getNewLineForOldUnchangedLine(testMrVersion, diffFile.old_path, 1)).toBe(1);
    });

    it('extrapolates the last unchanged line indexes', () => {
      // the only information we get is from the hunks
      // for a file that's 1000 lines long we might have only a diff hunk for a change from the beginning
      // of that file. But that change might have shifted the unchanged line old and new index difference
      // for all lines following that change (e.g. removed line will decrease the new line index by 1 for
      // all following lines)
      expect(getNewLineForOldUnchangedLine(testMrVersion, diffFile.old_path, 100)).toBe(96); // this is the last unchanged line available from the diff hunk
      expect(getNewLineForOldUnchangedLine(testMrVersion, diffFile.old_path, 1000)).toBe(996);
    });
  });
});
