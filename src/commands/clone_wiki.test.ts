import * as vscode from 'vscode';
import { cloneWiki } from './clone_wiki';
import { pickInstance } from '../gitlab/pick_instance';
import { pickProject } from '../gitlab/pick_project';
import { project } from '../test_utils/entities';

jest.mock('../gitlab/pick_instance');
jest.mock('../gitlab/pick_project');
jest.mock('../gitlab/gitlab_service');

describe('cloneWiki', () => {
  it('calls git.clone command with selected URL', async () => {
    (pickInstance as jest.Mock).mockImplementation(() => 'https://gitlab.com');
    (pickProject as jest.Mock).mockImplementation(() => project);
    (vscode.window.showQuickPick as jest.Mock).mockImplementation(([option]) => option);

    await cloneWiki();

    expect(vscode.commands.executeCommand).toBeCalledWith(
      'git.clone',
      'git@gitlab.com:gitlab-org/gitlab-vscode-extension.wiki.git',
    );
  });
});
