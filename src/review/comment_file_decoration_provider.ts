import * as vscode from 'vscode';

export const fileDecorationProvider: vscode.FileDecorationProvider = {
  provideFileDecoration: uri => {
    if (uri.scheme === 'file') {
      const params = new URLSearchParams(uri.query);
      const hasComments = params.get('hasComments') === 'true';
      if (hasComments) {
        return {
          badge: '💬',
        };
      }
    }
    return undefined;
  },
};
