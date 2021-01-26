import * as vscode from 'vscode';
import * as execa from 'execa';
import * as url from 'url';
import { GITLAB_COM_URL } from '../constants';
import { tokenService } from '../services/token_service';
import { log } from '../log';

async function fetch(cmd: string, workspaceFolder: string): Promise<string | null> {
  const [git, ...args] = cmd.trim().split(' ');
  const { stdout } = await execa(git, args, {
    cwd: workspaceFolder,
    preferLocal: false,
  });
  return stdout;
}

async function fetchGitRemoteUrls(workspaceFolder: string): Promise<string[]> {
  const fetchGitRemotesVerbose = async (): Promise<string[]> => {
    const output = await fetch('git remote -v', workspaceFolder);

    return (output || '').split('\n');
  };

  const parseRemoteFromVerboseLine = (line: string) => {
    // git remote -v output looks like
    // origin[TAB]git@gitlab.com:gitlab-org/gitlab-vscode-extension.git[WHITESPACE](fetch)
    // the interesting part is surrounded by a tab symbol and a whitespace

    return line.split(/\t| /)[1];
  };

  const remotes = await fetchGitRemotesVerbose();
  const remoteUrls = remotes.map(remote => parseRemoteFromVerboseLine(remote)).filter(Boolean);

  // git remote -v returns a (fetch) and a (push) line for each remote,
  // so we need to remove duplicates
  return [...new Set(remoteUrls)];
}

async function intersectionOfInstanceAndTokenUrls(workspaceFolder: string) {
  const uriHostname = (uri: string) => url.parse(uri).host;

  const instanceUrls = tokenService.getInstanceUrls();
  const gitRemotes = await fetchGitRemoteUrls(workspaceFolder);
  const gitRemoteHosts = gitRemotes.map(uriHostname);

  return instanceUrls.filter(host => gitRemoteHosts.includes(uriHostname(host)));
}

async function heuristicInstanceUrl(workspaceFolder: string) {
  // if the intersection of git remotes and configured PATs exists and is exactly
  // one hostname, use it
  const intersection = await intersectionOfInstanceAndTokenUrls(workspaceFolder);
  if (intersection.length === 1) {
    const heuristicUrl = intersection[0];
    log(`Found ${heuristicUrl} in the PAT list and git remotes, using it as the instanceUrl`);
    return heuristicUrl;
  }

  if (intersection.length > 1) {
    log(`Found more than one intersection of git remotes and configured PATs, ${intersection}`);
  }

  return null;
}

export async function getInstanceUrl(workspaceFolder?: string): Promise<string> {
  const { instanceUrl } = vscode.workspace.getConfiguration('gitlab');
  // if the workspace setting exists, use it
  if (instanceUrl) {
    return instanceUrl;
  }

  // legacy logic in GitLabService might not have the workspace folder available
  // in that case we just skip the heuristic
  if (workspaceFolder) {
    // try to determine the instance URL heuristically
    const heuristicUrl = await heuristicInstanceUrl(workspaceFolder);
    if (heuristicUrl) {
      return heuristicUrl;
    }
  }

  // default to Gitlab cloud
  return GITLAB_COM_URL;
}
