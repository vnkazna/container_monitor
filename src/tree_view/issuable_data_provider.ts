import * as vscode from 'vscode';
import { CustomQueryItemModel } from './items/custom_query_item_model';
import { MultirootCustomQueryItemModel } from './items/multiroot_custom_query_item_model';

import { CustomQuery } from '../gitlab/custom_query';
import { ItemModel } from './items/item_model';
import { CONFIG_CUSTOM_QUERIES, CONFIG_NAMESPACE } from '../constants';
import { logError } from '../log';
import { ErrorItem } from './items/error_item';
import { extensionState } from '../extension_state';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { WrappedRepository } from '../git/wrapped_repository';

async function getAllGitlabRepositories(): Promise<WrappedRepository[]> {
  const projectsWithUri = gitExtensionWrapper.repositories.map(async repository => {
    await repository.getProject(); // make sure we tried to fetch the project
    return repository;
  });

  return Promise.all(projectsWithUri);
}

export class IssuableDataProvider implements vscode.TreeDataProvider<ItemModel | vscode.TreeItem> {
  private eventEmitter = new vscode.EventEmitter<void>();

  private children: ItemModel[] = [];

  onDidChangeTreeData = this.eventEmitter.event;

  constructor() {
    extensionState.onDidChangeValid(this.refresh, this);
  }

  async getChildren(el: ItemModel | undefined): Promise<ItemModel[] | vscode.TreeItem[]> {
    if (el) return el.getChildren();

    this.children.forEach(ch => ch.dispose());
    this.children = [];
    if (!extensionState.isValid()) {
      return [];
    }
    let repositories: WrappedRepository[] = [];
    try {
      repositories = await getAllGitlabRepositories();
    } catch (e) {
      logError(e);
      return [new ErrorItem('Fetching Issues and MRs failed')];
    }
    if (repositories.length === 0) return [new vscode.TreeItem('No projects found')];
    // FIXME: if you are touching this configuration statement, move the configuration to extension_configuration.ts
    const customQueries =
      vscode.workspace
        .getConfiguration(CONFIG_NAMESPACE)
        .get<CustomQuery[]>(CONFIG_CUSTOM_QUERIES) || [];
    if (repositories.length === 1) {
      this.children = customQueries.map(q => new CustomQueryItemModel(q, repositories[0]));
      return this.children;
    }
    this.children = customQueries.map(q => new MultirootCustomQueryItemModel(q, repositories));
    return this.children;
  }

  // eslint-disable-next-line class-methods-use-this
  getParent(): null {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  getTreeItem(item: vscode.TreeItem | ItemModel) {
    if (item instanceof ItemModel) return item.getTreeItem();
    return item;
  }

  refresh(): void {
    this.eventEmitter.fire();
  }
}

export const issuableDataProvider = new IssuableDataProvider();
