import * as vscode from 'vscode';
import { REMOTE_URI_SCHEME } from '../constants';
import { HelpError } from '../errors/help_error';
import { GitLabRemote } from '../gitlab/clone/gitlab_remote_source_provider';
import { GitLabProject } from '../gitlab/gitlab_project';
import { pickGitRef } from '../gitlab/pick_git_ref';
import { pickInstance } from '../gitlab/pick_instance';
import { pickProject } from '../gitlab/pick_project';
import { tokenService } from '../services/token_service';
import { openRepository } from './open_repository';

jest.mock('../services/token_service');
jest.mock('../gitlab/pick_instance');
jest.mock('../gitlab/pick_project');
jest.mock('../gitlab/pick_git_ref');

describe('openRepository', () => {
  const instanceUrls = ['https://gitlab.com', 'https://example.com'];

  const cancelOnce = () =>
    (vscode.window.showQuickPick as jest.Mock).mockImplementationOnce(() => undefined);
  const pickOnce = (label: string) =>
    (vscode.window.showQuickPick as jest.Mock).mockImplementationOnce(
      (items: vscode.QuickPickItem[]) => {
        const item = items.find(i => i.label.indexOf(label) >= 0);
        if (!item) throw new Error(`There is no item labeled ${label}!`);
        return item;
      },
    );
  const alwaysInput = (url: string | undefined) =>
    (vscode.window.showInputBox as jest.Mock).mockImplementation(() => url);

  beforeEach(() => {
    tokenService.getInstanceUrls = () => instanceUrls;

    (vscode.window.createQuickPick as jest.Mock).mockImplementation(() => {
      return {
        onDidChangeValue: jest.fn(),
        items: [],
      };
    });
  });

  it('stops if the open action quick pick is canceled', async () => {
    cancelOnce();
    await openRepository();
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  describe('enter a URL', () => {
    beforeEach(() => {
      pickOnce('Open in current window');
      pickOnce('Enter gitlab-remote URL');
    });

    it('stops if the URL input is canceled', async () => {
      alwaysInput(undefined);
      await openRepository();
      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    });

    it('opens the selected URL', async () => {
      const uri = `${REMOTE_URI_SCHEME}://gitlab.com/GitLab?project=gitlab-org/gitlab&ref=main`;
      alwaysInput(uri);
      await openRepository();
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openFolder',
        vscode.Uri.parse(uri),
        false,
      );
    });

    it('does not open a window for an invalid URL', async () => {
      const uri = `not-${REMOTE_URI_SCHEME}://gitlab.com/GitLab?project=gitlab-org/gitlab&ref=main`;
      alwaysInput(uri);
      await expect(openRepository).rejects.toThrow(HelpError);
      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    });
  });

  describe('choose a project', () => {
    beforeEach(() => {
      pickOnce('Open in current window');
      pickOnce('Choose a project');
    });

    const remote: GitLabRemote = {
      name: '$(repo) Foo Bar',
      url: ['https://example.com/foo/bar.git'],
      wikiUrl: ['https://example.com/foo/bar.wiki.git'],
      project: {
        restId: 1,
        name: 'Foo Bar',
      } as GitLabProject,
    };

    const branch: Partial<RestBranch> & { refType: 'branch' } = {
      refType: 'branch',
      name: 'main',
    };

    it('constructs and opens the correct URL', async () => {
      (pickInstance as jest.Mock).mockImplementation(() => 'https://example.com');
      (pickProject as jest.Mock).mockImplementation(() => remote);
      (pickGitRef as jest.Mock).mockImplementation(() => branch);
      alwaysInput('FooBar');

      await openRepository();

      expect(pickInstance).toHaveBeenCalled();
      expect(pickProject).toHaveBeenCalled();
      expect(pickGitRef).toHaveBeenCalled();
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'vscode.openFolder',
        vscode.Uri.parse('gitlab-remote://example.com/FooBar?project=1&ref=main'),
        false,
      );
    });
  });
});
