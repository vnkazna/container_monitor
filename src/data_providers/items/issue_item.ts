import { TreeItem } from 'vscode';

export class IssueItem extends TreeItem {
  issue: RestIssuable;

  project: VsProject;

  constructor(issue: RestIssuable, project: VsProject) {
    super(`#${issue.iid} · ${issue.title}`);
    this.issue = issue;
    this.project = project;
    this.command = {
      command: 'gl.showRichContent',
      arguments: [this.issue, this.project.uri],
      title: 'Show Issue',
    };
  }
}
