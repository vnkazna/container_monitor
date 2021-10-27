import * as vscode from 'vscode';
import { CustomQueryItemModel } from './custom_query_item_model';
import { CustomQuery } from '../../gitlab/custom_query';
import { ItemModel } from './item_model';
import { WrappedRepository } from '../../git/wrapped_repository';
import { ErrorItem } from './error_item';

export class RepositoryItemModel extends ItemModel {
  private repository: WrappedRepository;

  private customQueries: CustomQuery[];

  constructor(repository: WrappedRepository, customQueries: CustomQuery[]) {
    super();
    this.repository = repository;
    this.customQueries = customQueries;
  }

  getTreeItem(): vscode.TreeItem {
    if (!this.repository.containsGitLabProject) {
      return new ErrorItem(`${this.repository.name}: Project failed to load`);
    }
    const item = new vscode.TreeItem(
      this.repository.name,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.iconPath = new vscode.ThemeIcon('project');
    return item;
  }

  async getChildren(): Promise<ItemModel[]> {
    const children = this.customQueries.map(q => new CustomQueryItemModel(q, this.repository));
    this.setDisposableChildren(children);
    return children;
  }
}
