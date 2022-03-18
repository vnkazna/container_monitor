/* eslint-disable max-classes-per-file */
import vscode from 'vscode';
import crypto from 'crypto';
import { openUrl } from '../openers';

interface AuthUrlParams {
  clientId: string;
  redirectUri: string;
  responseType?: string;
  state: string;
  scopes: string;
  codeChallenge: string;
  codeChallengeMethod?: string;
}

function sha256(plain: string) {
  // returns promise ArrayBuffer
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.createHash('sha256').update(data);
}

async function generateCodeChallengeFromVerifier(v: string) {
  return sha256(v).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const createAuthUrl = ({
  clientId,
  redirectUri,
  responseType = 'code',
  state,
  scopes,
  codeChallenge,
  codeChallengeMethod = 'S256',
}: AuthUrlParams) =>
  `https://gitlab.com/oauth/authorize` +
  `?client_id=${clientId}` +
  `&redirect_uri=${encodeURI(redirectUri)}` +
  `&response_type=${responseType}` +
  `&state=${state}` +
  `&scope=${scopes}` +
  `&code_challenge=${codeChallenge}` +
  `&code_challenge_method=${codeChallengeMethod}`;

const login = async (scopesParam?: readonly string[]) => {
  const state = crypto.randomBytes(20).toString('hex');
  const isInsiders = /insiders/i.test(vscode.version);
  const schema = isInsiders ? 'vscode-insiders' : 'vscode';
  const redirectUri = `${schema}://gitlab-authentication`;
  const codeVerifier = crypto.randomBytes(20).toString('hex'); // TODO: maybe use the whole alphanumeric range
  const codeChallenge = await generateCodeChallengeFromVerifier(codeVerifier);
  const scopes = 'api,read_user';
  const clientId = 'abc';
  await openUrl(createAuthUrl({ clientId, redirectUri, state, scopes, codeChallenge }));
};

export class GitLabAuthProvider implements vscode.AuthenticationProvider {
  #eventEmitter =
    new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();

  onDidChangeSessions = this.#eventEmitter.event;

  async getSessions(scopes?: readonly string[]): Thenable<readonly vscode.AuthenticationSession[]> {
    return [];
  }

  async createSession(scopes: readonly string[]): Thenable<vscode.AuthenticationSession> {
    await login();
    throw new Error();
  }

  removeSession(sessionId: string): Thenable<void> {
    throw new Error('Method not implemented. 3');
  }
}

export const authenticate = async () => {
  await vscode.authentication.getSession('gitlab', ['api', 'read_user'], { createIfNone: true });
};

export class GitLabUriHandler implements vscode.UriHandler {
  async handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
    await vscode.window.showInformationMessage(uri.toString());
  }
}
