import * as vscode from 'vscode';
import gitlabCiVariables = require('./ci_variables.json');

const findDollarSignIndex = (document: vscode.TextDocument, position: vscode.Position): number => {
  const textUntilPosition = document.lineAt(position).text.substr(0, position.character);

  return textUntilPosition.lastIndexOf('$');
};

export class CiCompletionProvider implements vscode.CompletionItemProvider {
  // eslint-disable-next-line class-methods-use-this
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    const linePrefix = findDollarSignIndex(document, position);

    return gitlabCiVariables.map(({ name, description }) => {
      const item = new vscode.CompletionItem(`$${name}`, vscode.CompletionItemKind.Constant);
      item.documentation = new vscode.MarkdownString(description);
      item.range = new vscode.Range(position.with(undefined, linePrefix), position);
      return item;
    });
  }
}
