import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { diffFile, issuable, mrVersion, project } from '../../test_utils/entities';
import { ChangedFileItem } from './changed_file_item';

describe('ChangedFileItem', () => {
  describe('image file', () => {
    it.each(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp', '.avif', '.apng'])(
      'should not show diff for %s',
      extension => {
        const changedImageFile = { ...diffFile, new_path: `file${extension}` };
        const item = new ChangedFileItem(issuable, mrVersion, changedImageFile, project);
        expect(item.command?.command).toBe(PROGRAMMATIC_COMMANDS.NO_IMAGE_REVIEW);
      },
    );
  });
});
