import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { diffFile, issue, mrVersion } from '../../test_utils/entities';
import { ChangedFileItem } from './changed_file_item';

describe('ChangedFileItem', () => {
  describe('image file', () => {
    it.each(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp', '.avif', '.apng'])(
      'should not show diff for %s',
      extension => {
        const changedImageFile = { ...diffFile, new_path: `file${extension}` };
        const item = new ChangedFileItem(issue, mrVersion, changedImageFile, '/repository/fsPath');
        expect(item.command?.command).toBe(PROGRAMMATIC_COMMANDS.NO_IMAGE_REVIEW);
      },
    );
  });
});
