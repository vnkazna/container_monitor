import { diffFile, mrVersion } from '../test_utils/entities';
import { getAddedLinesForFile } from './diff_line_count';

describe('diff_line_count', () => {
  describe('getAddedLinesForFile', () => {
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
      `@@ -1,7 +1,4 @@`,
      ` # Initial readme`,
      `-8`,
      `-9`,
      `-@@ -5,14 +1,20 @@`,
      ` 0`,
      ` 1`,
      ` 2`,
      `@@ -19,6 +9,7 @@`,
      ` 7`,
      ` 8`,
      ` 9`,
      `+@@ -5,14 +1,20 @@`,
      ` @@ -29,3 +11,3 @@`,
      ` 0`,
      ` 1`,
    ].join('\n');

    it.each`
      hunkName                          | hunk                            | newLines
      ${'sevenNewLinesHunk'}            | ${sevenNewLinesHunk}            | ${[1, 2, 3, 4, 5, 6, 7]}
      ${'hunkWithAddedAndRemovedLines'} | ${hunkWithAddedAndRemovedLines} | ${[13, 14, 18, 24]}
      ${'multiHunk'}                    | ${multiHunk}                    | ${[15, 39, 40, 97, 98]}
      ${'hunkWithHunkHeaders'}          | ${hunkWithHunkHeaders}          | ${[12]}
    `('$hunkName gets correctly parsed', ({ hunk, newLines }) => {
      const testMrVersion = {
        ...mrVersion,
        diffs: [{ ...diffFile, diff: hunk }],
      };

      const ranges = getAddedLinesForFile(testMrVersion, diffFile.new_path);

      expect(ranges).toEqual(newLines);
    });
  });
});
