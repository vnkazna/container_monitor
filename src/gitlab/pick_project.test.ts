import * as vscode from 'vscode';
import { showQuickPick } from '../utils/show_quickpick';
import { pickWithOther } from './pick_project';

jest.mock('../utils/show_quickpick');

const other: vscode.QuickPickItem & { alwaysShow: true } = {
  label: 'Other',
  alwaysShow: true,
};

const otherResolved: vscode.QuickPickItem = {
  label: 'Resolved',
};

const item: vscode.QuickPickItem = {
  label: 'Item',
};

describe('pickWithOther', () => {
  const alwaysPickOptionN = (n: number) => {
    (showQuickPick as jest.Mock).mockImplementation(async picker => {
      // Wait for a moment for the list to be populated
      await new Promise(r => setTimeout(r, 1));
      return picker.items[n];
    });
  };

  const alwaysInput = (answer: string | undefined) => {
    (vscode.window.showInputBox as jest.Mock).mockImplementation(() => answer);
  };

  beforeEach(() => {
    (vscode.window.createQuickPick as jest.Mock).mockImplementation(() => {
      return {
        onDidChangeValue: jest.fn(),
        items: [],
      };
    });
  });

  it('returns undefined when the picker is canceled', async () => {
    alwaysPickOptionN(-1);
    const pick = vscode.window.createQuickPick();
    const r = await pickWithOther(
      pick,
      () => Promise.resolve([item]),
      other,
      () => Promise.resolve(otherResolved),
    );
    expect(r).toBeUndefined();
  });

  it('returns the selected item', async () => {
    alwaysPickOptionN(1);
    const pick = vscode.window.createQuickPick();
    const r = await pickWithOther(
      pick,
      () => Promise.resolve([item]),
      other,
      () => Promise.resolve(otherResolved),
    );
    expect(r).toStrictEqual(item);
  });

  describe('when other is selected', () => {
    beforeEach(() => alwaysPickOptionN(0));

    it('resolves the user-provided value', async () => {
      const pick = vscode.window.createQuickPick();
      pick.value = 'something';
      const r = await pickWithOther(
        pick,
        () => Promise.resolve([item]),
        other,
        () => Promise.resolve(otherResolved),
      );
      expect(r).toStrictEqual(otherResolved);
    });

    describe('when a value is provided', () => {
      it('does not show an input box', async () => {
        const pick = vscode.window.createQuickPick();
        pick.value = 'some user-provided string';
        await pickWithOther(
          pick,
          () => Promise.resolve([item]),
          other,
          v => {
            expect(v).toStrictEqual('some user-provided string');
            return Promise.resolve(otherResolved);
          },
        );
        expect(vscode.window.showInputBox).toHaveBeenCalledTimes(0);
      });
    });

    describe('when no value is provided', () => {
      beforeEach(() => alwaysInput(undefined));

      it('shows an input box', async () => {
        const pick = vscode.window.createQuickPick();
        await pickWithOther(
          pick,
          () => Promise.resolve([item]),
          other,
          () => Promise.resolve(otherResolved),
        );
        expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
      });

      it('returns undefined when the input box is canceled', async () => {
        const pick = vscode.window.createQuickPick();
        const r = await pickWithOther(
          pick,
          () => Promise.resolve([item]),
          other,
          () => Promise.resolve(otherResolved),
        );
        expect(vscode.window.showInputBox).toHaveBeenCalledTimes(1);
        expect(r).toStrictEqual(undefined);
      });

      it.each`
        value
        ${true}
        ${false}
      `('preserves ignoreFocusOut: $value', async ({ value }) => {
        const pick = vscode.window.createQuickPick();
        pick.ignoreFocusOut = value;
        await pickWithOther(
          pick,
          () => Promise.resolve([item]),
          other,
          () => Promise.resolve(otherResolved),
        );
        expect(vscode.window.showInputBox).toHaveBeenCalledWith({
          ignoreFocusOut: value,
          title: undefined,
        });
      });
    });
  });
});
