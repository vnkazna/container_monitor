import * as vscode from 'vscode';
import { REMOTE_URI_SCHEME } from '../constants';
import { HelpError } from '../errors/help_error';
import { tokenService } from '../services/token_service';
import { OpenAction, openRepository } from './open_repository';

jest.mock('../services/token_service');

describe('openRepository', () => {
  const instanceUrls = ['https://gitlab.com'];

  const alwaysPick = (id: OpenAction | undefined) =>
    (vscode.window.showQuickPick as jest.Mock).mockImplementation(() => ({ id }));
  const alwaysInput = (url: string | undefined) =>
    (vscode.window.showInputBox as jest.Mock).mockImplementation(() => url);

  beforeEach(() => {
    tokenService.getInstanceUrls = () => instanceUrls;
  });

  it('stops if the open action quick pick is canceled', async () => {
    alwaysPick(undefined);
    await openRepository();
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('stops if the URL input is canceled', async () => {
    alwaysPick('replace');
    alwaysInput(undefined);
    await openRepository();
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('opens a window with the selected URL', async () => {
    const uri = `${REMOTE_URI_SCHEME}://gitlab.com/GitLab?project=gitlab-org/gitlab&ref=main`;
    alwaysPick('new-window');
    alwaysInput(uri);
    await openRepository();
    expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'vscode.openFolder',
      vscode.Uri.parse(uri),
      true,
    );
  });

  it('does not open a window for an invalid URL', async () => {
    const uri = `not-${REMOTE_URI_SCHEME}://gitlab.com/GitLab?project=gitlab-org/gitlab&ref=main`;
    alwaysPick('new-window');
    alwaysInput(uri);
    await expect(openRepository()).rejects.toThrow(HelpError);
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });
});
