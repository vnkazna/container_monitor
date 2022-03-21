/* eslint-disable */
import vscode from 'vscode';
import crypto from 'crypto';
import { openUrl } from '../openers';
import { PromiseAdapter, promiseFromEvent } from '../utils/promise_from_event';
import { uriHandler } from '../services/uri_handler';
import fetch from 'cross-fetch';

const CLIENT_ID = '89975480e8bdd858e5267784b6db81db98f8f27662c757b2f0589e7e3e1f2503';
const REDIRECT_URI = `${vscode.env.uriScheme}://gitlab.gitlab-workflow/authentication`;

interface BaseAuthParams {
  clientId: string;
  redirectUri: string;
}
interface AuthUrlParams extends BaseAuthParams {
  responseType?: string;
  state: string;
  scopes: string;
  codeChallenge: string;
  codeChallengeMethod?: string;
}

interface ExchangeUrlParams extends BaseAuthParams {
  code: string;
  codeVerifier: string;
}

function sha256(plain: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.createHash('sha256').update(data);
}

function generateCodeChallengeFromVerifier(v: string) {
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

const createExchangeBody = ({ clientId, redirectUri, code, codeVerifier }: ExchangeUrlParams) =>
  `client_id=${clientId}&code=${code}&grant_type=authorization_code&redirect_uri=${redirectUri}&code_verifier=${codeVerifier}`;

const createLoginUrl = (
  scopesParam?: readonly string[],
): { url: string; state: string; codeVerifier: string } => {
  const state = crypto.randomBytes(20).toString('hex');
  const redirectUri = REDIRECT_URI;
  const codeVerifier = crypto.randomBytes(20).toString('hex'); // TODO: maybe use the whole alphanumeric range
  const codeChallenge = generateCodeChallengeFromVerifier(codeVerifier);
  const scopes = scopesParam?.join('+') ?? 'api+read_user';
  const clientId = CLIENT_ID;
  return {
    url: createAuthUrl({ clientId, redirectUri, state, scopes, codeChallenge }),
    state,
    codeVerifier,
  };
};

export class GitLabAuthProvider implements vscode.AuthenticationProvider {
  #eventEmitter =
    new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
  #requestsInProgress: Record<string, string> = {};

  onDidChangeSessions = this.#eventEmitter.event;

  async getSessions(scopes?: readonly string[]): Promise<readonly vscode.AuthenticationSession[]> {
    return [];
  }

  async createSession(scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
    const { url, state, codeVerifier } = createLoginUrl(scopes);
    this.#requestsInProgress[state] = codeVerifier;
    const { promise } = promiseFromEvent(uriHandler.event, this.exchangeCodeForToken(state));
    await openUrl(url);
    const token = await Promise.race([
      promise,
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000)),
    ]);
    return { accessToken: token, account: { id: 'abc', label: 'account' }, id: 'abc', scopes };
  }

  removeSession(sessionId: string): Thenable<void> {
    throw new Error('Method not implemented. 3');
  }

  finishAuthentication(state: string, code: string) {
    const codeVerifier = this.#requestsInProgress[state];
    if (!codeVerifier)
      throw new Error(
        `Can't finish authentication with state $state. This VS Code instance hasn't started this authentication`,
      );
  }

  exchangeCodeForToken: (state: string) => PromiseAdapter<vscode.Uri, string> =
    state => async (uri, resolve, reject) => {
      if (uri.path !== '/authentication') return;
      const searchParams = new URLSearchParams(uri.query);
      const state = searchParams.get('state');
      if (!state) {
        reject(new Error(`Authentication URL ${uri} didn't contain 'state' query param.`));
        return;
      }
      const codeVerifier = this.#requestsInProgress[state];
      if (!codeVerifier) return;
      const code = searchParams.get('code');
      if (!code) {
        reject(new Error(`Authentication URL ${uri} didn't contain 'code' query param.`));
        return;
      }
      const response = await fetch('https://gitlab.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: createExchangeBody({
          clientId: CLIENT_ID,
          redirectUri: REDIRECT_URI,
          code,
          codeVerifier,
        }),
      });
      const payload = await response.json();
      resolve(payload.access_token);
    };
}

export const gitlabAuthenticationProvider = new GitLabAuthProvider();

export const authenticate = async () => {
  await vscode.authentication.getSession('gitlab', ['api', 'read_user'], { createIfNone: true });
};
