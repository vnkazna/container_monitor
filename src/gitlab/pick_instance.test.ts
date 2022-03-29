import * as vscode from 'vscode';
import { Credentials, tokenService } from '../services/token_service';
import { testCredentials } from '../test_utils/test_credentials';
import { pickInstance } from './pick_instance';

jest.mock('../services/token_service');

describe('pickInstance', () => {
  let credentials: Credentials[];

  beforeEach(() => {
    (vscode.window.showQuickPick as jest.Mock).mockImplementation(([option]) => option);
    tokenService.getAllCredentials = () => credentials;
  });

  it('skips selection of instance if there is only one', async () => {
    credentials = [testCredentials('https://gitlab.com')];

    await pickInstance();

    expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
  });

  it('asks for instance if there are multiple', async () => {
    credentials = [testCredentials('https://gitlab.com'), testCredentials('https://example.com')];

    await pickInstance();

    expect(vscode.window.showQuickPick).toHaveBeenCalled();
  });
});
