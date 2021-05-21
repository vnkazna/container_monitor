import * as vscode from 'vscode';
import { CustomQueryItemModel } from './custom_query_item_model';
import { CustomQuery } from '../../gitlab/custom_query';
import { ItemModel } from './item_model';
import { WrappedRepository } from '../../git/wrapped_repository';

export class MultirootCustomQueryItemModel extends ItemModel {
  private repositories: WrappedRepository[];

  private customQuery: CustomQuery;

  constructor(customQuery: CustomQuery, workspaces: WrappedRepository[]) {
    super();
    this.customQuery = customQuery;
    this.repositories = workspaces;
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
    const queryModels = this.repositories.map(
      p => new CustomQueryItemModel(this.customQuery, p, true),
    );
    this.setDisposableChildren(queryModels);
    return queryModels;
  }
}
