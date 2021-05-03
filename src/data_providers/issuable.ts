import * as vscode from 'vscode';
import { basename } from 'path';
import { CustomQueryItemModel } from './items/custom_query_item_model';
import { MultirootCustomQueryItemModel } from './items/multiroot_custom_query_item_model';

import * as gitLabService from '../gitlab_service';
import { CustomQuery } from '../gitlab/custom_query';
import { ItemModel } from './items/item_model';
import { CONFIG_CUSTOM_QUERIES, CONFIG_NAMESPACE } from '../constants';
import { logError } from '../log';
import { ErrorItem } from './items/error_item';
import { extensionState } from '../extension_state';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';

async function getAllGitlabRepositories(): Promise<GitLabRepository[]> {
  const projectsWithUri = gitExtensionWrapper.repositories.map(async repository => {
    const uri = repository.rootFsPath;
    try {
      const currentProject = await gitLabService.fetchCurrentProject(uri);
      return {
        label: currentProject?.name ?? basename(uri),
        uri,
      };
    } catch (e) {
      logError(e);
      return { label: basename(uri), uri, error: true };
    }
  });

  return Promise.all(projectsWithUri);
}

export class DataProvider implements vscode.TreeDataProvider<ItemModel | vscode.TreeItem> {
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
    let workspaces: GitLabWorkspace[] = [];
    try {
      workspaces = await getAllGitlabRepositories();
    } catch (e) {
      logError(e);
      return [new ErrorItem('Fetching Issues and MRs failed')];
    }
    if (workspaces.length === 0) return [new vscode.TreeItem('No projects found')];
    // FIXME: if you are touching this configuration statement, move the configuration to get_extension_configuration.ts
    const customQueries =
      vscode.workspace
        .getConfiguration(CONFIG_NAMESPACE)
        .get<CustomQuery[]>(CONFIG_CUSTOM_QUERIES) || [];
    if (workspaces.length === 1) {
      this.children = customQueries.map(q => new CustomQueryItemModel(q, workspaces[0]));
      return this.children;
    }
    this.children = customQueries.map(q => new MultirootCustomQueryItemModel(q, workspaces));
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
