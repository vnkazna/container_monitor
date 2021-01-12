import * as vscode from 'vscode';
import { CustomQueryItemModel } from './custom_query_item_model';
import { CustomQuery } from '../../gitlab/custom_query';
import { ItemModel } from './item_model';

export class MultirootCustomQueryItemModel extends ItemModel {
  private projects: VsProject[];

  private customQuery: CustomQuery;

  constructor(customQuery: CustomQuery, projects: VsProject[]) {
    super();
    this.customQuery = customQuery;
    this.projects = projects;
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
    const queryModels = this.projects.map(p => new CustomQueryItemModel(this.customQuery, p, true));
    this.setDisposableChildren(queryModels);
    return queryModels;
  }
}
