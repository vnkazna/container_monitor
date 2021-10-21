import * as vscode from 'vscode';
import { MultirootCustomQueryItemModel } from './multiroot_custom_query_item_model';
import { CustomQueryItemModel } from './custom_query_item_model';
import { customQuery } from '../../test_utils/entities';
import { WrappedRepository } from '../../git/wrapped_repository';

const repository = ({
  name: 'GitLab Project',
  rootFsPath: '/path/to/repo',
  containsGitLabProject: true,
} as unknown) as WrappedRepository;

const projects = [
  { ...repository, name: 'project 1' },
  { ...repository, name: 'project 2' },
] as any;

describe('MultirootCustomQueryItem', () => {
  let item: MultirootCustomQueryItemModel;

  beforeEach(() => {
    item = new MultirootCustomQueryItemModel(customQuery, projects);
  });

  it('should use query name to create collapsed item', async () => {
    const treeItem = await item.getTreeItem();
    expect(treeItem.label).toBe('Query name');
    expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
  });

  it('should return custom query children with project label', async () => {
    const [a, b] = await item.getChildren();
    expect(a).toBeInstanceOf(CustomQueryItemModel);
    expect(b).toBeInstanceOf(CustomQueryItemModel);
    expect(await a.getTreeItem().label).toBe('project 1');
    expect(await b.getTreeItem().label).toBe('project 2');
  });
});
