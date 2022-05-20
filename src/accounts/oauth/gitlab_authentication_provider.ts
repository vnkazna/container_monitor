import vscode from 'vscode';
import crypto from 'crypto';
import assert from 'assert';
import { openUrl } from '../../openers';
import { PromiseAdapter, promiseFromEvent } from '../../utils/promise_from_event';
import { GitLabUriHandler, gitlabUriHandler } from '../../gitlab_uri_handler';
import { accountService, AccountService } from '../account_service';
import { makeAccountId, OAuthAccount } from '../account';
import { sort } from '../../utils/sort';
import { ExchangeTokenResponse, GitLabService } from '../../gitlab/gitlab_service';
import { GITLAB_COM_URL, OAUTH_CLIENT_ID, OAUTH_REDIRECT_URI } from '../../constants';
import { generateSecret } from '../../utils/generate_secret';

const generateCodeChallengeFromVerifier = (v: string) => {
  const sha256 = (plain: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return crypto.createHash('sha256').update(data);
  };
  return sha256(v).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

interface OAuthUrlParams {
  clientId: string;
  redirectUri: string;
  responseType?: string;
  state: string;
  scopes: string;
  codeChallenge: string;
  codeChallengeMethod?: string;
}

const createAuthUrl = ({
  clientId,
  redirectUri,
  responseType = 'code',
  state,
  scopes,
  codeChallenge,
  codeChallengeMethod = 'S256',
}: OAuthUrlParams) =>
  `${GITLAB_COM_URL}/oauth/authorize?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
    state,
    scope: scopes,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
  })}`;

const createLoginUrl = (
  scopesParam?: readonly string[],
): { url: string; state: string; codeVerifier: string } => {
  const state = generateSecret();
  const redirectUri = OAUTH_REDIRECT_URI;
  const codeVerifier = generateSecret();
  const codeChallenge = generateCodeChallengeFromVerifier(codeVerifier);
  const scopes = (scopesParam ?? ['api', 'read_user']).join(' ');
  const clientId = OAUTH_CLIENT_ID;
  return {
    url: createAuthUrl({ clientId, redirectUri, state, scopes, codeChallenge }),
    state,
    codeVerifier,
  };
};

const scopesString = (scopes: readonly string[]) => sort(scopes).join();

const convertAccountToAuthenticationSession = (
  account: OAuthAccount,
): vscode.AuthenticationSession => ({
  accessToken: account.token,
  id: account.id,
  scopes: account.scopes,
  account: {
    id: account.id,
    label: `${account.instanceUrl} (${account.username})`,
  },
});

export class GitLabAuthenticationProvider implements vscode.AuthenticationProvider {
  #uriHandler: GitLabUriHandler;

  #eventEmitter =
    new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();

  #requestsInProgress: Record<string, string> = {};

  #accountService: AccountService;

  constructor(as = accountService, uh = gitlabUriHandler) {
    this.#accountService = as;
    this.#uriHandler = uh;
  }

  onDidChangeSessions = this.#eventEmitter.event;

  async getSessions(scopes?: readonly string[]): Promise<readonly vscode.AuthenticationSession[]> {
    return this.#accountService
      .getAllAccounts()
      .filter((a): a is OAuthAccount => a.type === 'oauth')
      .filter(a => !scopes || scopesString(a.scopes) === scopesString(scopes))
      .map(convertAccountToAuthenticationSession);
  }

  async createSession(scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
    const { url, state, codeVerifier } = createLoginUrl(scopes);
    this.#requestsInProgress[state] = codeVerifier;
    const { promise: receivedRedirectUrl, cancel: cancelWaitingForRedirectUrl } = promiseFromEvent(
      this.#uriHandler.event,
      this.exchangeCodeForToken(state),
    );
    await openUrl(url);
    const tokenResponse = await Promise.race([
      receivedRedirectUrl,
      new Promise<ExchangeTokenResponse>((_, reject) => {
        setTimeout(
          () => reject(new Error('Cancelling the GitLab OAuth login after 60s. Try again.')),
          60000,
        );
      }),
    ]).finally(() => {
      delete this.#requestsInProgress[state];
      cancelWaitingForRedirectUrl.fire();
    });
    const user = await new GitLabService({
      instanceUrl: GITLAB_COM_URL,
      token: tokenResponse.access_token,
    }).getCurrentUser();
    const account: OAuthAccount = {
      instanceUrl: GITLAB_COM_URL,
      token: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAtTimestampInSeconds: tokenResponse.created_at + tokenResponse.expires_in,
      codeVerifier,
      id: makeAccountId(GITLAB_COM_URL, user.id),
      type: 'oauth',
      username: user.username,
      scopes: [...scopes],
    };
    await this.#accountService.addAccount(account);
    return convertAccountToAuthenticationSession(account);
  }

  async removeSession(sessionId: string): Promise<void> {
    await this.#accountService.removeAccount(sessionId);
  }

  exchangeCodeForToken: (state: string) => PromiseAdapter<vscode.Uri, ExchangeTokenResponse> =
    /* This callback is triggered on every vscode://gitlab-workflow URL.
    We will ignore invocations that are not related to the OAuth login with given `state`. */
    state => async (uri, resolve, reject) => {
      if (uri.path !== '/authentication') return;
      const searchParams = new URLSearchParams(uri.query);
      const urlState = searchParams.get('state');
      if (!urlState) {
        reject(new Error(`Authentication URL ${uri} didn't contain 'state' query param.`));
        return;
      }
      if (state !== urlState) return;
      const codeVerifier = this.#requestsInProgress[state];
      assert(codeVerifier, 'Code verifier is missing.');
      const code = searchParams.get('code');
      if (!code) {
        reject(new Error(`Authentication URL ${uri} didn't contain 'code' query param.`));
        return;
      }
      const payload = await GitLabService.exchangeToken({
        instanceUrl: GITLAB_COM_URL,
        grantType: 'authorization_code',
        code,
        codeVerifier,
      });
      resolve(payload);
    };
}

export const gitlabAuthenticationProvider = new GitLabAuthenticationProvider();
