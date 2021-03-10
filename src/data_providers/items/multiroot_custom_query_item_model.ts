import * as vscode from 'vscode';
import { CustomQueryItemModel } from './custom_query_item_model';
import { CustomQuery } from '../../gitlab/custom_query';
import { ItemModel } from './item_model';

export class MultirootCustomQueryItemModel extends ItemModel {
  private workspaces: GitLabWorkspace[];

  private customQuery: CustomQuery;

  constructor(customQuery: CustomQuery, workspaces: GitLabWorkspace[]) {
    super();
    this.customQuery = customQuery;
    this.workspaces = workspaces;
  }

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(
      this.customQuery.name,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.iconPath = new vscode.ThemeIcon('filter');
    return item;
  }

  async getChildren(): Promise<ItemModel[]> {
    const queryModels = this.workspaces.map(
      p => new CustomQueryItemModel(this.customQuery, p, true),
    );
    this.setDisposableChildren(queryModels);
    return queryModels;
  }
}
