import * as vscode from 'vscode';
import { CustomQueryItemModel } from './items/custom_query_item_model';
import { MultirootCustomQueryItemModel } from './items/multiroot_custom_query_item_model';

import * as gitLabService from '../gitlab_service';
import { CustomQuery } from '../gitlab/custom_query';
import { ItemModel } from './items/item_model';
import { CONFIG_CUSTOM_QUERIES, CONFIG_NAMESPACE } from '../constants';

export class DataProvider implements vscode.TreeDataProvider<ItemModel | vscode.TreeItem> {
  private eventEmitter = new vscode.EventEmitter<void>();

  private children: ItemModel[] = [];

  onDidChangeTreeData = this.eventEmitter.event;

  async getChildren(el: ItemModel | undefined): Promise<ItemModel[] | vscode.TreeItem[]> {
    if (el) return el.getChildren();

    this.children.forEach(ch => ch.dispose());
    this.children = [];

    const projects = await gitLabService.getAllGitlabProjects();
    if (projects.length === 0) return [new vscode.TreeItem('No projects found')];
    const customQueries =
      vscode.workspace
        .getConfiguration(CONFIG_NAMESPACE)
        .get<CustomQuery[]>(CONFIG_CUSTOM_QUERIES) || [];
    if (projects.length === 1) {
      this.children = customQueries.map(q => new CustomQueryItemModel(q, projects[0]));
      return this.children;
    }
    this.children = customQueries.map(q => new MultirootCustomQueryItemModel(q, projects));
    return this.children;
  }

  // eslint-disable-next-line class-methods-use-this
  getParent() {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  getTreeItem(item: vscode.TreeItem | ItemModel) {
    if (item instanceof ItemModel) return item.getTreeItem();
    return item;
  }

  refresh() {
    this.eventEmitter.fire();
  }
}
