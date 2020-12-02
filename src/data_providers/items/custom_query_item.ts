import * as vscode from 'vscode';
import * as gitLabService from '../../gitlab_service';
import { handleError } from '../../log';
import { ErrorItem } from './error_item';
import { MrItem } from './mr_item';
import { ExternalUrlItem } from './external_url_item';
import { IssueItem } from './issue_item';
import { VulnerabilityItem } from './vulnerability_item';
import { CustomQuery } from '../../gitlab/custom_query';
import { CustomQueryType } from '../../gitlab/custom_query_type';

export class CustomQueryItem extends vscode.TreeItem {
  private project: VsProject;

  private customQuery: CustomQuery;

  constructor(customQuery: CustomQuery, project: VsProject, showProject = false) {
    super(
      showProject ? project.label : customQuery.name,
      vscode.TreeItemCollapsibleState.Collapsed,
    );

    this.project = project;
    this.customQuery = customQuery;
    this.iconPath = showProject ? new vscode.ThemeIcon('project') : new vscode.ThemeIcon('filter');
  }

  private async getProjectIssues(): Promise<vscode.TreeItem[]> {
    const issues = await gitLabService.fetchIssuables(this.customQuery, this.project.uri);
    if (issues.length === 0) {
      const noItemText = this.customQuery.noItemText || 'No items found.';
      return [new vscode.TreeItem(noItemText)];
    }

    const { MR, ISSUE, SNIPPET, EPIC, VULNERABILITY } = CustomQueryType;
    switch (this.customQuery.type) {
      case MR:
        return issues.map((mr: RestIssuable) => new MrItem(mr, this.project));
      case ISSUE:
        return issues.map((issue: RestIssuable) => new IssueItem(issue, this.project));
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

  async getChildren(): Promise<vscode.TreeItem[]> {
    try {
      return this.getProjectIssues();
    } catch (e) {
      handleError(e);
      return [new ErrorItem()];
    }
  }
}
