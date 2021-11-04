const assert = require('assert');
const vscode = require('vscode');
const {
  createAndOpenFile,
  closeAndDeleteFile,
  getRepositoryRoot,
} = require('./test_infrastructure/helpers');
const ciVariables = require('../../src/completion/ci_variables.json');

describe('CI variable completion', () => {
  describe('.gitlab-ci.yml', () => {
    const gitlabCiYml = vscode.Uri.parse(`${getRepositoryRoot()}/.gitlab-ci.yml`);

    const write = async string => {
      const editor = vscode.window.activeTextEditor;
      await editor.edit(editBuilder => {
        editBuilder.insert(editor.selection.start, string);
      });
    };

    const openCompletion = async position =>
      vscode.commands.executeCommand('vscode.executeCompletionItemProvider', gitlabCiYml, position);

    beforeEach(async () => {
      const ext = vscode.extensions.getExtension('gitlab.gitlab-workflow');
      await ext.activate();
      await createAndOpenFile(gitlabCiYml);
    });

    afterEach(async () => {
      await closeAndDeleteFile(gitlabCiYml);
    });

    it("won't complete when no dollar is found", async () => {
      const text = 'image: alpine:';
      await write(text);

      const position = new vscode.Position(0, text.length - 1);
      const completions = await openCompletion(position);

      assert.deepStrictEqual(
        completions.items.filter(item => item.kind === vscode.CompletionItemKind.Constant),
        [],
      );
    });

    it('will complete for one variable', async () => {
      const text = '$CI_COMMIT_HASH';
      await write(text);

      const position = new vscode.Position(0, text.length - 1);
      const completions = await openCompletion(position);

      assert.strictEqual(completions.items.length, ciVariables.length);

      const { start, end } = completions.items[0].range;
      assert.deepStrictEqual(start.character, 0);
      assert.deepStrictEqual(end, position);
    });

    it('will handle multiple $ characters on the same line', async () => {
      const text = `  if: '$CI_COMMIT_BRANCH == "master" && $CI_PIPELINE_SOURCE == "schedule" && $FREQUEN`;
      await write(text);

      const position = new vscode.Position(0, text.length - 1);
      const completions = await openCompletion(position);

      const { start } = completions.items[0].range;
      assert.deepStrictEqual(
        start.character,
        text.length - 8,
        'completion item should start at the position of the last $',
      );
    });
  });
});
