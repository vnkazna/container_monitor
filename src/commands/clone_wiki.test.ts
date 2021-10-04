import * as vscode from 'vscode';
import { cloneWiki } from './clone_wiki';
import { tokenService } from '../services/token_service';
import { GitLabRemote } from '../gitlab/clone/gitlab_remote_source_provider';
import { pickInstance } from '../gitlab/pick_instance';
import { pickProject } from '../gitlab/pick_project';

jest.mock('../services/token_service');
jest.mock('../gitlab/pick_instance');
jest.mock('../gitlab/pick_project');

const wikiRemoteSource = {
  name: `$(repo) gitlab-org/gitlab-vscode-extension`,
  description: 'description',
  wikiUrl: [
    'git@gitlab.com:gitlab-org/gitlab-vscode-extension.wiki.git',
    'https://gitlab.com/gitlab-org/gitlab-vscode-extension.wiki.git',
  ],
};

describe('cloneWiki', () => {
  it('calls git.clone command with selected URL', async () => {
    tokenService.getInstanceUrls = () => ['https://gitlab.com'];
    (pickInstance as jest.Mock).mockImplementation(() => 'https://gitlab.com');
    (pickProject as jest.Mock).mockImplementation(() => wikiRemoteSource as GitLabRemote);
    (vscode.window.showQuickPick as jest.Mock).mockImplementation(([option]) => option);

    await cloneWiki();

    expect(vscode.commands.executeCommand).toBeCalledWith(
      'git.clone',
      'git@gitlab.com:gitlab-org/gitlab-vscode-extension.wiki.git',
    );
  });
});
