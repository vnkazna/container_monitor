import * as vscode from 'vscode';
import assert from 'assert';
import { handleError } from '../../log';
import { ErrorItem } from './error_item';
import { MrItemModel } from './mr_item_model';
import { ExternalUrlItem } from './external_url_item';
import { IssueItem } from './issue_item';
import { VulnerabilityItem } from './vulnerability_item';
import { CustomQuery } from '../../gitlab/custom_query';
import { CustomQueryType } from '../../gitlab/custom_query_type';
import { ItemModel } from './item_model';
import { GitLabRepository, WrappedRepository } from '../../git/wrapped_repository';
import { convertRepositoryToProject } from '../../utils/convert_repository_to_project';

export class CustomQueryItemModel extends ItemModel {
  private repository: WrappedRepository;

  private customQuery: CustomQuery;

  constructor(customQuery: CustomQuery, repository: WrappedRepository) {
    super();
    this.repository = repository;
    this.customQuery = customQuery;
  }

  getTreeItem(): vscode.TreeItem {
    assert(this.repository.containsGitLabProject);

    const item = new vscode.TreeItem(
      this.customQuery.name,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.iconPath = new vscode.ThemeIcon('filter');
    return item;
  }

  private async getProjectIssues(): Promise<vscode.TreeItem[] | ItemModel[]> {
    const issues = await this.repository
      .getGitLabService()
      .getIssuables(this.customQuery, (await this.repository.getProject())!); // FIXME use GitLabRepository instead of WrappedRepository
    if (issues.length === 0) {
      const noItemText = this.customQuery.noItemText || 'No items found.';
      return [new vscode.TreeItem(noItemText)];
    }

    const { MR, ISSUE, SNIPPET, EPIC, VULNERABILITY } = CustomQueryType;
    const projectInRepository = await convertRepositoryToProject(
      this.repository as GitLabRepository,
    );
    switch (this.customQuery.type) {
      case MR: {
        const mrModels = issues.map(
          (mr: RestIssuable) => new MrItemModel(mr as RestMr, projectInRepository),
        );
        this.setDisposableChildren(mrModels);
        return mrModels;
      }
      case ISSUE:
        return issues.map(
          (issue: RestIssuable) => new IssueItem(issue, this.repository.rootFsPath),
        );
      case SNIPPET:
        return issues.map(
          (snippet: RestIssuable) =>
            new ExternalUrlItem(`$${snippet.id} · ${snippet.title}`, snippet.web_url),
        );
      case EPIC:
        return issues.map(
          (epic: RestIssuable) => new ExternalUrlItem(`&${epic.iid} · ${epic.title}`, epic.web_url),
        );
      case VULNERABILITY:
        return issues.map((v: RestVulnerability) => new VulnerabilityItem(v));
      default:
        throw new Error(`unknown custom query type ${this.customQuery.type}`);
    }
  }

  async getChildren(): Promise<vscode.TreeItem[] | ItemModel[]> {
    try {
      return await this.getProjectIssues();
    } catch (e) {
      handleError(e);
      return [new ErrorItem()];
    }
  }
}
