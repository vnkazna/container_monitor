import * as vscode from 'vscode';
import { WrappedRepository } from '../../git/wrapped_repository';
import { customQuery } from '../../test_utils/entities';

import { CustomQueryItemModel } from './custom_query_item_model';

describe('CustomQueryItem', () => {
  let item: vscode.TreeItem;
  const repository = {
    name: 'GitLab Project',
    rootFsPath: '/path/to/repo',
    containsGitLabProject: true,
  } as unknown as WrappedRepository;

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
});
