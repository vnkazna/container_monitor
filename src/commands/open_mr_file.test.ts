import * as vscode from 'vscode';
import * as fs from 'fs';
import { VS_COMMANDS } from '../command_names';
import { toReviewUri } from '../review/review_uri';
import { mrVersion, reviewUriParams } from '../test_utils/entities';
import { openMrFile } from './open_mr_file';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { WrappedRepository } from '../git/wrapped_repository';
import { asMock } from '../test_utils/as_mock';

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
  },
}));

describe('openMrFile', () => {
  beforeEach(() => {
    jest
      .spyOn(gitExtensionWrapper, 'getRepository')
      .mockReturnValue({ getMr: () => ({ mrVersion }) } as unknown as WrappedRepository);
    asMock(fs.promises.access).mockResolvedValue(undefined);
  });

  it('calls VS Code open with the correct diff file', async () => {
    await openMrFile(toReviewUri({ ...reviewUriParams, path: 'new_file.js' }));
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      VS_COMMANDS.OPEN,
      vscode.Uri.file('/new_file.js'),
    );
  });

  it("calls shows information message when the file doesn't exist", async () => {
    asMock(fs.promises.access).mockRejectedValue(new Error());
    await openMrFile(toReviewUri({ ...reviewUriParams, path: 'new_file.js' }));
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    expect(vscode.window.showWarningMessage).toHaveBeenCalled();
  });

  it("throws assertion error if the diff can't be found", async () => {
    await expect(
      openMrFile(toReviewUri({ ...reviewUriParams, path: 'file_that_is_not_in_mr_diff.c' })),
    ).rejects.toThrowError(/Extension did not find the file/);
  });
});
