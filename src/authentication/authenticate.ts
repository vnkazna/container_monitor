/* eslint-disable */
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
  const redirectUri = `${vscode.env.uriScheme}://gitlab.gitlab-workflow/authentication`;
  const codeVerifier = crypto.randomBytes(20).toString('hex'); // TODO: maybe use the whole alphanumeric range
  const codeChallenge = await generateCodeChallengeFromVerifier(codeVerifier);
  const scopes = 'api+read_user';
  const clientId = '89975480e8bdd858e5267784b6db81db98f8f27662c757b2f0589e7e3e1f2503';
  await openUrl(createAuthUrl({ clientId, redirectUri, state, scopes, codeChallenge }));
};

export class GitLabAuthProvider implements vscode.AuthenticationProvider {
  #eventEmitter =
    new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();

  onDidChangeSessions = this.#eventEmitter.event;

  async getSessions(scopes?: readonly string[]): Promise<readonly vscode.AuthenticationSession[]> {
    return [];
  }

  async createSession(scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
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
  async handleUri(uri: vscode.Uri): Promise<void> {
    // new URLSearchParams(uri.query).get('code')
    // '0f4abb275a9c5f0fe6f4ccaabab2c8aac68dbf1a069cd4155af631557e7d25b0'
    // new URLSearchParams(uri.query).get('state')
    // '385fefb8fcc11c1d106483891c10ae9255adfa1c'
    if (uri.path === '/authentication') {
      const searchParams = new URLSearchParams(uri.query);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
    }
    await vscode.window.showInformationMessage(uri.toString());
    // I get back
    // vscode-insiders://gitlab.gitlab-workflow/authentication?code%3D164a822dc14d7838ae795ba026103e490dae6a7e6c649f7105bcb86607a8ecfc%26state%3D94aee5d3bc305ef324cf7c58cc90dc72b32b94a6
  }
}
