import * as vscode from 'vscode';
import { tokenService } from '../services/token_service';
import { showQuickPick } from '../utils/show_quickpick';
import { GitLabRemoteSourceProvider } from './clone/gitlab_remote_source_provider';
import { pickProject } from './pick_project';

jest.mock('../utils/show_quickpick');
jest.mock('../services/token_service');
jest.mock('./clone/gitlab_remote_source_provider');

describe('pickProject', () => {
  const instanceUrls = ['https://gitlab.com'];
  const projects = [
    { name: 'foo', label: 'foo' },
    { name: 'bar', label: 'bar' },
    { name: 'baz', label: 'baz' },
  ];

  const alwaysPickOptionN = (n: number, v?: string) => {
    (showQuickPick as jest.Mock).mockImplementation(async picker => {
      // Wait for a moment for the list to be populated
      await new Promise(r => setTimeout(r, 1));
      // eslint-disable-next-line no-param-reassign
      if (v) picker.value = v;
      return picker.items[n];
    });
  };

  const alwaysInput = (answer: string | undefined) => {
    (vscode.window.showInputBox as jest.Mock).mockImplementation(() => answer);
  };

  beforeEach(() => {
    tokenService.getInstanceUrls = () => instanceUrls;

    (vscode.window.createQuickPick as jest.Mock).mockImplementation(() => {
      return {
        onDidChangeValue: jest.fn(),
        items: [],
      };
    });

    (GitLabRemoteSourceProvider as jest.Mock).mockImplementation(() => ({
      getRemoteSources(query?: string) {
        if (!query) return projects;
        return projects.filter(p => p.name.indexOf(query) >= 0);
      },

      lookupByPath(path: string) {
        return projects.find(p => p.name === path);
      },
    }));
  });

  it('returns undefined when the picker is canceled', async () => {
    alwaysPickOptionN(-1);
    const r = await pickProject('https://gitlab.com');
    expect(r).toBeUndefined();
  });

  it('returns the selected item', async () => {
    alwaysPickOptionN(1);
    const r = await pickProject('https://gitlab.com');
    expect(r).toStrictEqual(projects[0]);
  });

  describe('when other is selected', () => {
    beforeEach(() => alwaysPickOptionN(0));

    it('resolves the user-provided value', async () => {
      alwaysInput(projects[2].name);
      const r = await pickProject('https://gitlab.com');
      expect(r).toStrictEqual(projects[2]);
    });

    describe('when a value is provided', () => {
      beforeEach(() => alwaysPickOptionN(0, projects[2].name));

      it('does not show an input box', async () => {
        await pickProject('https://gitlab.com');
        expect(vscode.window.showInputBox).toHaveBeenCalledTimes(0);
      });
    });

    describe('when no value is provided', () => {
      beforeEach(() => alwaysInput(undefined));

      it('shows an input box', async () => {
        await pickProject('https://gitlab.com');
        expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
      });

      it('returns undefined when the input box is canceled', async () => {
        const r = await pickProject('https://gitlab.com');
        expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
        expect(r).toStrictEqual(undefined);
      });
    });
  });
});
