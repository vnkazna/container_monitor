import * as vscode from 'vscode';
import { Account } from '../services/account';
import { accountService } from '../services/account_service';
import { createAccount } from '../test_utils/entities';
import { pickAccount } from './pick_account';

jest.mock('../services/account_service');

describe('pickAccount', () => {
  let accounts: Account[];

  beforeEach(() => {
    (vscode.window.showQuickPick as jest.Mock).mockImplementation(([option]) => option);
    accountService.getAllAccounts = () => accounts;
  });

  it('skips selection of instance if there is only one', async () => {
    accounts = [createAccount()];

    await pickAccount();

    expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
  });

  it('asks for instance if there are multiple', async () => {
    accounts = [createAccount('https://gitlab.com'), createAccount('https://example.com')];

    await pickAccount();

    expect(vscode.window.showQuickPick).toHaveBeenCalled();
  });
});
