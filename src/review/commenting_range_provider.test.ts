import * as vscode from 'vscode';
import { diffFile, mr, mrVersion } from '../test_utils/entities';
import { CommentingRangeProvider } from './commenting_range_provider';
import { ReviewParams, toReviewUri } from './review_uri';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';
import { FF_COMMENTING_RANGES } from '../constants';

jest.mock('../utils/get_extension_configuration');

describe('CommentingRangeProvider', () => {
  let commentingRangeProvider: CommentingRangeProvider;
  const commonUriParams: ReviewParams = {
    mrId: mr.id,
    projectId: mr.project_id,
    workspacePath: '/',
  };

  const oldFileUrl = toReviewUri({
    ...commonUriParams,
    commit: mrVersion.base_commit_sha,
    path: diffFile.old_path,
  });

  const newFileUri = toReviewUri({
    ...commonUriParams,
    commit: mrVersion.head_commit_sha,
    path: diffFile.new_path,
  });

  beforeEach(() => {
    (getExtensionConfiguration as jest.Mock).mockReturnValue({
      featureFlags: [FF_COMMENTING_RANGES],
    });
    commentingRangeProvider = new CommentingRangeProvider(mr, mrVersion);
  });

  it('returns empty array for different URI schema', () => {
    const testDocument = {
      uri: vscode.Uri.parse('https://example.com'),
    } as vscode.TextDocument;
    expect(commentingRangeProvider.provideCommentingRanges(testDocument)).toEqual([]);
  });

  it('returns full range (all lines in the document) for old file', () => {
    const testDocument = {
      uri: oldFileUrl,
      lineCount: 200,
    } as vscode.TextDocument;
    expect(commentingRangeProvider.provideCommentingRanges(testDocument)).toEqual([
      new vscode.Range(new vscode.Position(0, 0), new vscode.Position(199, 0)),
    ]);
  });

  it('returns empty array with the feature flag off', () => {
    (getExtensionConfiguration as jest.Mock).mockReturnValue({
      featureFlags: undefined,
    });
    const testDocument = {
      uri: oldFileUrl,
      lineCount: 200,
    } as vscode.TextDocument;
    expect(commentingRangeProvider.provideCommentingRanges(testDocument)).toEqual([]);
  });

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

  it.each`
    hunkName                          | hunk                            | newLines
    ${'sevenNewLinesHunk'}            | ${sevenNewLinesHunk}            | ${[1, 2, 3, 4, 5, 6, 7]}
    ${'hunkWithAddedAndRemovedLines'} | ${hunkWithAddedAndRemovedLines} | ${[13, 14, 18, 24]}
    ${'multiHunk'}                    | ${multiHunk}                    | ${[15, 39, 40, 97, 98]}
  `('$hunkName gets correctly parsed', ({ hunk, newLines }) => {
    commentingRangeProvider = new CommentingRangeProvider(mr, {
      ...mrVersion,
      diffs: [{ ...diffFile, diff: hunk }],
    });

    const ranges = commentingRangeProvider.provideCommentingRanges({
      uri: newFileUri,
    } as vscode.TextDocument);

    // VS Code indexes lines starting with zero, adding 1 to normalize line numbers
    expect(ranges.map(r => r.start.line + 1)).toEqual(newLines);
  });
});
