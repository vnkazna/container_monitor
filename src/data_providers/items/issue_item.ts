import { TreeItem } from 'vscode';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';

export class IssueItem extends TreeItem {
  issue: RestIssuable;

  project: VsProject;

  constructor(issue: RestIssuable, project: VsProject) {
    super(`#${issue.iid} · ${issue.title}`);
    this.issue = issue;
    this.project = project;
    this.command = {
      command: PROGRAMMATIC_COMMANDS.SHOW_RICH_CONTENT,
      arguments: [this.issue, this.project.uri],
      title: 'Show Issue',
    };
  }
}
