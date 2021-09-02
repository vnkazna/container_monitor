import * as vscode from 'vscode';
import { tokenService } from '../services/token_service';
import { pickInstance } from './pick_instance';

jest.mock('../services/token_service');

describe('pickInstance', () => {
  let instanceUrls: string[];

  beforeEach(() => {
    (vscode.window.showQuickPick as jest.Mock).mockImplementation(([option]) => option);
    tokenService.getInstanceUrls = () => instanceUrls;
  });

  it('skips selection of instance if there is only one', async () => {
    instanceUrls = ['https://gitlab.com'];

    await pickInstance();

    expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
  });

  it('asks for instance if there are multiple', async () => {
    instanceUrls = ['https://gitlab.com', 'https://example.com'];

    await pickInstance();

    expect(vscode.window.showQuickPick).toHaveBeenCalled();
  });
});
