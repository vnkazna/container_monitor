/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import vscode from 'vscode';

class GitLabUriHandler extends vscode.EventEmitter<vscode.Uri> implements vscode.UriHandler {
  async handleUri(uri: vscode.Uri): Promise<void> {
    // new URLSearchParams(uri.query).get('code')
    // '0f4abb275a9c5f0fe6f4ccaabab2c8aac68dbf1a069cd4155af631557e7d25b0'
    // new URLSearchParams(uri.query).get('state')
    // '385fefb8fcc11c1d106483891c10ae9255adfa1c'
    this.fire(uri);
    // if (uri.path === '/authentication') {
    //   const searchParams = new URLSearchParams(uri.query);
    //   const code = searchParams.get('code');
    //   const state = searchParams.get('state');
    // }
    // await vscode.window.showInformationMessage(uri.toString());
    // I get back
    // vscode-insiders://gitlab.gitlab-workflow/authentication?code%3D164a822dc14d7838ae795ba026103e490dae6a7e6c649f7105bcb86607a8ecfc%26state%3D94aee5d3bc305ef324cf7c58cc90dc72b32b94a6
  }
}

export const uriHandler = new GitLabUriHandler();
