import * as vscode from 'vscode';
import { CustomQueryType } from '../../gitlab/custom_query_type';

import { CustomQueryItem } from './custom_query_item';

describe('CustomQueryItem', () => {
  const customQuery = {
    name: 'Query name',
    type: CustomQueryType.ISSUE,
    maxResults: 10,
    scope: 'all',
    state: 'closed',
    wip: 'no',
    confidential: false,
    excludeSearchIn: 'all',
    orderBy: 'created_at',
    sort: 'desc',
    searchIn: 'all',
    noItemText: 'No item',
  };
  const project = { label: 'Project label', uri: '/' };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let item;

  describe('item labeled as a query', () => {
    beforeEach(() => {
      item = new CustomQueryItem(customQuery, project);
    });

    it('should have query name as label', () => {
      expect(vscode.TreeItem).toBeCalledWith(
        'Query name',
        vscode.TreeItemCollapsibleState.Collapsed,
      );
    });

    it('should have filter icon', () => {
      expect(vscode.ThemeIcon).toHaveBeenCalledWith('filter');
    });
  });

  describe('item labeled as a project', () => {
    beforeEach(() => {
      item = new CustomQueryItem(customQuery, project, true);
    });

    it('should have project label as label', () => {
      expect(vscode.TreeItem).toBeCalledWith(
        'Project label',
        vscode.TreeItemCollapsibleState.Collapsed,
      );
    });

    it('should have project icon', () => {
      expect(vscode.ThemeIcon).toHaveBeenCalledWith('project');
    });
  });
});
