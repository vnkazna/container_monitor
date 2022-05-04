import * as vscode from 'vscode';
import { accountService } from '../services/account_service';
import { Credentials } from '../services/credentials';
import { testCredentials } from '../test_utils/test_credentials';
import { pickInstance } from './pick_instance';

jest.mock('../services/account_service');

describe('pickInstance', () => {
  let credentials: Credentials[];

  beforeEach(() => {
    (vscode.window.showQuickPick as jest.Mock).mockImplementation(([option]) => option);
    accountService.getAllCredentials = () => credentials;
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
