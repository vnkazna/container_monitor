import vscode from 'vscode';
import { GITLAB_COM_URL } from './constants';
import { makeAccountId } from './services/account';
import { accountService } from './services/account_service';
import { getUserForCredentialsOrFail } from './services/get_user_for_credentials_or_fail';
import { removeTrailingSlash } from './utils/remove_trailing_slash';
import { validateInstanceUrl } from './utils/validate_instance_url';

export async function showInput() {
  const rawInstanceUrl = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    value: GITLAB_COM_URL,
    placeHolder: 'E.g. https://gitlab.com',
    prompt: 'URL to Gitlab instance',
    validateInput: validateInstanceUrl,
  });

  if (!rawInstanceUrl) return;

  const instanceUrl = removeTrailingSlash(rawInstanceUrl);

  const token = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    password: true,
    placeHolder: 'Paste your GitLab Personal Access Token...',
  });

  if (!token) return;
  const user = await getUserForCredentialsOrFail({ instanceUrl, token });
  await accountService.addAccount({
    instanceUrl,
    token,
    id: makeAccountId(instanceUrl, user.id),
    username: user.username,
  });
  await vscode.window.showInformationMessage(
    `Added the GitLab account for user ${user.username} on ${instanceUrl}.`,
  );
}

export async function removeTokenPicker() {
  const accounts = accountService.getRemovableAccounts();
  const result = await vscode.window.showQuickPick(
    accounts.map(a => ({ label: a.instanceUrl, description: a.username, id: a.id })),
    {
      ignoreFocusOut: true,
      placeHolder: 'Select Gitlab instance for PAT removal',
    },
  );

  if (result) {
    await accountService.removeAccount(result.id);
  }
}
