import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { CHANGE_TYPE_QUERY_KEY, HAS_COMMENTS_QUERY_KEY } from '../../constants';
import { diffFile, mr, mrVersion } from '../../test_utils/entities';
import { ChangedFileItem } from './changed_file_item';

describe('ChangedFileItem', () => {
  describe('image file', () => {
    it.each(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp', '.avif', '.apng'])(
      'should not show diff for %s',
      extension => {
        const changedImageFile = { ...diffFile, new_path: `file${extension}` };
        const item = new ChangedFileItem(mr, mrVersion, changedImageFile, '/repo', () => false);

        expect(item.command?.command).toBe(PROGRAMMATIC_COMMANDS.NO_IMAGE_REVIEW);
      },
    );

    it('should indicate change type', () => {
      const changedImageFile = { ...diffFile, new_path: `file.jpg` };
      const item = new ChangedFileItem(mr, mrVersion, changedImageFile, '/repo', () => false);

      expect(item.resourceUri?.query).toContain(`${CHANGE_TYPE_QUERY_KEY}=`);
    });
  });

  describe('captures whether there are comments on the changes', () => {
    let areThereChanges: boolean;

    const createItem = () =>
      new ChangedFileItem(mr, mrVersion, diffFile, '/repository/fsPath', () => areThereChanges);

    it('indicates there are comments', () => {
      areThereChanges = true;
      expect(createItem().resourceUri?.query).toMatch(`${HAS_COMMENTS_QUERY_KEY}=true`);
    });

    it('indicates there are no comments', () => {
      areThereChanges = false;
      expect(createItem().resourceUri?.query).toMatch(`${HAS_COMMENTS_QUERY_KEY}=false`);
    });
  });
});
