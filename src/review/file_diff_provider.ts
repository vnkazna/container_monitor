import * as vscode from 'vscode';
import * as assert from 'assert';
import * as path from 'path';
import { GitExtension } from '../api/git.d';
import { parseUriQuery } from '../utils/parse_uri_query';

export class GitContentProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

  get onDidChange(): vscode.Event<vscode.Uri> {
    return this._onDidChange.event;
  }

  private _fallback?: (uri: vscode.Uri) => Promise<string>;

  constructor() {}

  // eslint-disable-next-line
  async provideTextDocumentContent(
    uri: vscode.Uri,
    token: vscode.CancellationToken,
  ): Promise<string> {
    const gitExtension = vscode.extensions.getExtension<GitExtension>('vscode.git')?.exports;
    assert(gitExtension);
    const git = gitExtension.getAPI(1);
    const query = parseUriQuery(uri.query);
    const { workspace } = query;
    assert(workspace);
    const repository = git.getRepository(vscode.Uri.parse(workspace));
    return (
      (await repository?.show(query.commit || '', path.join(workspace, uri.path))) || 'problem'
    );
  }

  registerTextDocumentContentFallback(provider: (uri: vscode.Uri) => Promise<string>) {
    this._fallback = provider;
  }
}
