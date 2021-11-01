import * as vscode from 'vscode';
import { CustomQueryItemModel } from './custom_query_item_model';
import { customQuery } from '../../test_utils/entities';
import { WrappedRepository } from '../../git/wrapped_repository';
import { RepositoryItemModel } from './repository_item_model';

const repository = {
  name: 'GitLab Project',
  rootFsPath: '/path/to/repo',
  containsGitLabProject: true,
} as unknown as WrappedRepository;

describe('RepositoryItemModel', () => {
  let item: RepositoryItemModel;

  beforeEach(() => {
    item = new RepositoryItemModel(repository, [customQuery]);
  });

  it('should use project name to create collapsed item', async () => {
    const treeItem = await item.getTreeItem();
    expect(treeItem.label).toBe('GitLab Project');
    expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
  });

  it('should return custom query children', async () => {
    const [a] = await item.getChildren();
    expect(a).toBeInstanceOf(CustomQueryItemModel);
    expect(await a.getTreeItem().label).toBe(customQuery.name);
  });

  describe('item labeled as a project', () => {
    it('should have project name as a label', () => {
      expect(item.getTreeItem().label).toBe(repository.name);
    });

    it('should have project icon', () => {
      expect(item.getTreeItem().iconPath).toEqual(new vscode.ThemeIcon('project'));
    });
  });
});
