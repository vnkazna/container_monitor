const vscode = require('vscode');
const { openUrl } = require('./openers');

const WARNED_FLAG_NAME = 'warnedAboutCertDeprecation';

const checkDeprecatedCertificateSettings = async context => {
  const { ignoreCertificateErrors, ca, cert, certKey } = vscode.workspace.getConfiguration(
    'gitlab',
  );
  if (
    (ignoreCertificateErrors || ca || cert || certKey) &&
    !context.globalState.get(WARNED_FLAG_NAME)
  ) {
    const response = await vscode.window.showWarningMessage(
      `
You are using settings to set custom certificate for connecting to your GitLab instance.
This configuration is going to get removed in the next major version of GitLab Workflow extension.`,
      'See more details',
      "Don't show again",
    );
    if (response === "Don't show again") {
      context.globalState.update(WARNED_FLAG_NAME, true);
    } else if (response === 'See more details') {
      openUrl('https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/247');
    }
  }
};

module.exports = checkDeprecatedCertificateSettings;
