import * as vscode from 'vscode';
import { customQuery, repository } from '../../test_utils/entities';

import { CustomQueryItemModel } from './custom_query_item_model';

describe('CustomQueryItem', () => {
  let item: vscode.TreeItem;

  describe('item labeled as a query', () => {
    beforeEach(() => {
      item = new CustomQueryItemModel(customQuery, repository).getTreeItem();
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
      item = new CustomQueryItemModel(customQuery, repository, true).getTreeItem();
    });

    it('should have project name as a label', () => {
      expect(item.label).toBe(repository.name);
    });

    it('should have project icon', () => {
      expect(item.iconPath).toEqual(new vscode.ThemeIcon('project'));
    });
  });

  describe('item not containing a GitLab project', () => {
    beforeEach(() => {
      item = new CustomQueryItemModel(
        customQuery,
        { ...repository, containsGitLabProject: false } as any,
        true,
      ).getTreeItem();
    });

    it('should return an error item', () => {
      expect(item.label).toBe(`${repository.name}: Project failed to load`);
    });
  });
});
