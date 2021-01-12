import * as vscode from 'vscode';
import { MultirootCustomQueryItemModel } from './multiroot_custom_query_item_model';
import { CustomQueryItemModel } from './custom_query_item_model';
import { customQuery, project } from '../../test_utils/entities';

const projects = [
  { ...project, label: 'label p1' },
  { ...project, label: 'label p2' },
];

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
    expect(await a.getTreeItem().label).toBe('label p1');
    expect(await b.getTreeItem().label).toBe('label p2');
  });
});
