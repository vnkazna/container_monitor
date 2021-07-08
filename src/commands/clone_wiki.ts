import * as vscode from 'vscode';
import { tokenService } from '../services/token_service';
import { GitLabRemoteSourceProvider } from '../gitlab/clone/gitlab_remote_source_provider';
import { VS_COMMANDS } from '../command_names';
import { showQuickPick } from '../utils/show_quickpick';

interface RemoteSourceItem {
  label: string;
  url: string[];
  description: string;
}

async function pickRemoteProvider(): Promise<GitLabRemoteSourceProvider | undefined> {
  const instanceUrls = tokenService.getInstanceUrls();
  const instanceItems = instanceUrls.map(u => ({
    label: `$(project) ${u}`,
    instance: u,
  }));
  if (instanceItems.length === 0) {
    throw new Error('no GitLab instance found');
  }
  let selectedInstanceUrl;
  if (instanceItems.length === 1) {
    [selectedInstanceUrl] = instanceItems;
  } else {
    selectedInstanceUrl = await vscode.window.showQuickPick(instanceItems, {
      ignoreFocusOut: true,
      placeHolder: 'Select GitLab instance',
    });
  }
  if (!selectedInstanceUrl) {
    return undefined;
  }
  return new GitLabRemoteSourceProvider(selectedInstanceUrl.instance);
}

async function pickRemoteWikiSource(
  provider: GitLabRemoteSourceProvider,
): Promise<RemoteSourceItem | undefined> {
  const wikiPick = vscode.window.createQuickPick<RemoteSourceItem>();
  wikiPick.ignoreFocusOut = true;
  wikiPick.placeholder = 'Select GitLab project';
  const getSourceItemsForQuery = async (query?: string) => {
    const sources = await provider.getRemoteWikiSources(query);
    return sources.map(s => ({
      label: s.name,
      url: s.url as string[],
      description: s.description || '',
    }));
  };
  wikiPick.onDidChangeValue(async value => {
    wikiPick.items = await getSourceItemsForQuery(value);
  });
  wikiPick.items = await getSourceItemsForQuery();

  const selectedSource = await showQuickPick(wikiPick);
  return selectedSource;
}

export async function cloneWiki(): Promise<void> {
  const provider = await pickRemoteProvider();
  if (!provider) {
    return;
  }

  const selectedSource = await pickRemoteWikiSource(provider);
  if (!selectedSource) {
    return;
  }

  const selectedUrl = await vscode.window.showQuickPick(selectedSource.url, {
    ignoreFocusOut: true,
    placeHolder: 'Select URL to clone from',
  });

  if (!selectedUrl) {
    return;
  }

  await vscode.commands.executeCommand(VS_COMMANDS.GIT_CLONE, selectedUrl);
}
