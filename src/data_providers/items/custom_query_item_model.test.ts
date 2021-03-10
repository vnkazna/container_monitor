import * as vscode from 'vscode';
import { customQuery, workspace } from '../../test_utils/entities';

import { CustomQueryItemModel } from './custom_query_item_model';

describe('CustomQueryItem', () => {
  let item: vscode.TreeItem;

  describe('item labeled as a query', () => {
    beforeEach(() => {
      item = new CustomQueryItemModel(customQuery, workspace).getTreeItem();
    });

    it('should have query name as label', () => {
      expect(item.label).toBe('Query name');
    });

    it('should have filter icon', () => {
      expect(item.iconPath).toEqual(new vscode.ThemeIcon('filter'));
    });
  });

  describe('item labeled as a project', () => {
    beforeEach(() => {
      item = new CustomQueryItemModel(customQuery, workspace, true).getTreeItem();
    });

    it('should have project label as label', () => {
      expect(item.label).toBe('Project label');
    });

    it('should have project icon', () => {
      expect(item.iconPath).toEqual(new vscode.ThemeIcon('project'));
    });
  });

  describe('item with the error field', () => {
    beforeEach(() => {
      item = new CustomQueryItemModel(
        customQuery,
        { ...workspace, error: true },
        true,
      ).getTreeItem();
    });

    it('should return an error item', () => {
      expect(item.label).toBe(`${workspace.label}: Project failed to load`);
    });
  });
});
