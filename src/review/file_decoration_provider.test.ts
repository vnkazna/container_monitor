import * as vscode from 'vscode';
import { fileDecorationProvider, decorations } from './file_decoration_provider';
import { ADDED, DELETED, RENAMED, MODIFIED } from '../constants';

describe('FileDecoratorProvider', () => {
  it.each`
    changeType  | decoration
    ${ADDED}    | ${decorations[ADDED]}
    ${DELETED}  | ${decorations[DELETED]}
    ${RENAMED}  | ${decorations[RENAMED]}
    ${MODIFIED} | ${decorations[MODIFIED]}
  `('Correctly maps changeType to decorator', ({ changeType, decoration }) => {
    const uri: vscode.Uri = vscode.Uri.file(`./test?changeType=${changeType}`);
    const { token } = new vscode.CancellationTokenSource();
    const returnValue = fileDecorationProvider.provideFileDecoration(uri, token);

    expect(returnValue).toEqual(decoration);
  });
});
