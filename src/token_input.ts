import vscode from 'vscode';
import { GITLAB_COM_URL } from './constants';
import { FetchError } from './errors/fetch_error';
import { UserFriendlyError } from './errors/user_friendly_error';
import { GitLabService } from './gitlab/gitlab_service';
import { accountService } from './services/account_service';
import { Credentials } from './services/credentials';
import { validateInstanceUrl } from './utils/validate_instance_url';

const validateCredentialsAndGetUser = async ({
  instanceUrl,
  token,
}: Credentials): Promise<RestUser> => {
  try {
    return await new GitLabService({ instanceUrl, token }).getCurrentUser();
  } catch (e) {
    const message =
      e instanceof FetchError && e.status === 401
        ? `API Unauthorized: Can't add GitLab account for ${instanceUrl}. Is your token valid?`
        : `Request failed: Can't add GitLab account for ${instanceUrl}. Check your instance URL and network connection.`;

    throw new UserFriendlyError(message, e);
  }
};

export async function showInput() {
  const instanceUrl = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    value: GITLAB_COM_URL,
    placeHolder: 'E.g. https://gitlab.com',
    prompt: 'URL to Gitlab instance',
    validateInput: validateInstanceUrl,
  });

  if (!instanceUrl) return;

  const token = await vscode.window.showInputBox({
    ignoreFocusOut: true,
    password: true,
    placeHolder: 'Paste your GitLab Personal Access Token...',
  });

  if (!token) return;
  const user = await validateCredentialsAndGetUser({ instanceUrl, token });
  await accountService.setToken(instanceUrl, token);
  await vscode.window.showInformationMessage(
    `Added the GitLab account for user ${user.username} on ${instanceUrl}.`,
  );
}

export async function removeTokenPicker() {
  const instanceUrls = accountService.getRemovableInstanceUrls();
  const selectedInstanceUrl = await vscode.window.showQuickPick(instanceUrls, {
    ignoreFocusOut: true,
    placeHolder: 'Select Gitlab instance for PAT removal',
  });

  if (selectedInstanceUrl) {
    await accountService.setToken(selectedInstanceUrl, undefined);
  }
}
