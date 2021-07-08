import * as vscode from 'vscode';
import { cloneWiki } from './clone_wiki';
import { tokenService } from '../services/token_service';
import { RemoteSource } from '../api/git';
import { GitLabRemoteSourceProvider } from '../gitlab/clone/gitlab_remote_source_provider';
import { showQuickPick } from '../utils/show_quickpick';

jest.mock('../services/token_service');
jest.mock('../gitlab/clone/gitlab_remote_source_provider');
jest.mock('../utils/show_quickpick');

describe('cloneWiki', () => {
  const wikiRemoteSource = {
    name: `$(repo) gitlab-org/gitlab-vscode-extension`,
    description: 'description',
    url: [
      'git@gitlab.com:gitlab-org/gitlab-vscode-extension.wiki.git',
      'https://gitlab.com/gitlab-org/gitlab-vscode-extension.wiki.git',
    ],
  };
  let wikiRemoteSources: RemoteSource[];
  let instanceUrls: string[];

  const alwaysPickFirstOption = () => {
    (vscode.window.showQuickPick as jest.Mock).mockImplementation(([option]) => option);
    (showQuickPick as jest.Mock).mockImplementation(picker => picker.items[0]);
  };

  beforeEach(() => {
    tokenService.getInstanceUrls = () => instanceUrls;
    (GitLabRemoteSourceProvider as jest.Mock).mockImplementation(() => ({
      getRemoteWikiSources: () => wikiRemoteSources,
    }));
    wikiRemoteSources = [wikiRemoteSource];
    (vscode.window.createQuickPick as jest.Mock).mockImplementation(() => {
      const picker = {
        onDidChangeValue: jest.fn(),
        items: [],
      };
      return picker;
    });
  });

  it('skips selection of instance if there is only one', async () => {
    instanceUrls = ['https://gitlab.com'];
    alwaysPickFirstOption();

    await cloneWiki();

    expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(1);
    expect(vscode.window.createQuickPick).toHaveBeenCalledTimes(1);
  });

  it('asks for instance if there are multiple', async () => {
    instanceUrls = ['https://gitlab.com', 'https://example.com'];
    alwaysPickFirstOption();

    await cloneWiki();

    expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(2);
    expect(vscode.window.createQuickPick).toHaveBeenCalledTimes(1);
  });

  it('calls git.clone command with selected URL', async () => {
    instanceUrls = ['https://gitlab.com'];
    alwaysPickFirstOption();

    await cloneWiki();

    expect(vscode.commands.executeCommand).toBeCalledWith(
      'git.clone',
      'git@gitlab.com:gitlab-org/gitlab-vscode-extension.wiki.git',
    );
  });
});
