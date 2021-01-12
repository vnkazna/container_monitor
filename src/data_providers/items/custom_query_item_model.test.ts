import * as vscode from 'vscode';
import { customQuery, project } from '../../test_utils/entities';

import { CustomQueryItemModel } from './custom_query_item_model';

describe('CustomQueryItem', () => {
  let item: vscode.TreeItem;

  describe('item labeled as a query', () => {
    beforeEach(() => {
      item = new CustomQueryItemModel(customQuery, project).getTreeItem();
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
      item = new CustomQueryItemModel(customQuery, project, true).getTreeItem();
    });

    it('should have project label as label', () => {
      expect(item.label).toBe('Project label');
    });

    it('should have project icon', () => {
      expect(item.iconPath).toEqual(new vscode.ThemeIcon('project'));
    });
  });
});
