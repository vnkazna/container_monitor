import * as vscode from 'vscode';
import { CustomQueryItemModel } from './items/custom_query_item_model';
import { ItemModel } from './items/item_model';
import { logError } from '../log';
import { ErrorItem } from './items/error_item';
import { extensionState } from '../extension_state';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { WrappedRepository } from '../git/wrapped_repository';
import { getExtensionConfiguration } from '../utils/extension_configuration';
import { RepositoryItemModel } from './items/repository_item_model';
import { InvalidProjectItem } from './items/invalid_project_item';
import { onSidebarViewStateChange } from './sidebar_view_state';
import { gitlabProjectRepository } from '../gitlab/gitlab_project_repository';
import { MultipleProjectsItem } from './items/multiple_projects_item';

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
    onSidebarViewStateChange(this.refresh, this);
  }

  async getChildren(el: ItemModel | undefined): Promise<ItemModel[] | vscode.TreeItem[]> {
    if (el) return el.getChildren();

    this.children.forEach(ch => ch.dispose());
    this.children = [];
    if (!extensionState.isValid()) {
      return [];
    }
    if (getExtensionConfiguration().featureFlags?.includes('model-refactor')) {
      return this.getNewChildren();
    }
    let repositories: WrappedRepository[] = [];
    try {
      repositories = await getAllGitlabRepositories();
    } catch (e) {
      logError(e);
      return [new ErrorItem('Fetching Issues and MRs failed')];
    }
    const { customQueries } = getExtensionConfiguration();
    if (repositories.length === 1) {
      const [repository] = repositories;
      if (!repository.containsGitLabProject) return [new InvalidProjectItem(repository)];
      this.children = customQueries.map(q => new CustomQueryItemModel(q, repository));
      return this.children;
    }
    this.children = repositories.map(r => new RepositoryItemModel(r, customQueries));
    return this.children;
  }

  // eslint-disable-next-line class-methods-use-this
  async getNewChildren(): Promise<vscode.TreeItem[]> {
    return gitExtensionWrapper.gitRepositories.map(r => {
      const selected = gitlabProjectRepository.getSelectedOrDefaultForRepository(r.rootFsPath);
      if (selected) {
        const item = new vscode.TreeItem(selected.project.name);
        item.iconPath = new vscode.ThemeIcon('project');
        return item;
      }
      if (gitlabProjectRepository.repositoryHasAmbiguousProjects(r.rootFsPath)) {
        return new MultipleProjectsItem(r);
      }
      const item = new vscode.TreeItem(r.rootFsPath);
      item.iconPath = new vscode.ThemeIcon('error');
      return item;
    });
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
