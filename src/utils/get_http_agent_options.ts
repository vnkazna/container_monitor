import * as vscode from 'vscode';
import * as fs from 'fs';
import { UserFriendlyError } from '../errors/user_friendly_error';
import { handleError } from '../log';

interface GitLabHttpAgentOptions {
  ca?: Buffer;
  cert?: Buffer;
  key?: Buffer;
  proxy?: string;
  rejectUnauthorized?: boolean;
}

export const getHttpAgentOptions = (): GitLabHttpAgentOptions => {
  const result: GitLabHttpAgentOptions = {};
  const { ignoreCertificateErrors, ca, cert, certKey } = vscode.workspace.getConfiguration(
    'gitlab',
  );

  result.rejectUnauthorized = !ignoreCertificateErrors;
  if (ca) {
    try {
      result.ca = fs.readFileSync(ca);
    } catch (e) {
      handleError(new UserFriendlyError(`Cannot read CA '${ca}'`, e));
    }
  }
  if (cert) {
    try {
      result.cert = fs.readFileSync(cert);
    } catch (e) {
      handleError(new UserFriendlyError(`Cannot read Certificate '${cert}'`, e));
    }
  }
  if (certKey) {
    try {
      result.key = fs.readFileSync(certKey);
    } catch (e) {
      handleError(new UserFriendlyError(`Cannot read Certificate Key '${certKey}'`, e));
    }
  }

  const { proxy } = vscode.workspace.getConfiguration('http');
  result.proxy = proxy || undefined;
  return result;
};
