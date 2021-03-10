import { TreeItem } from 'vscode';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';

export class IssueItem extends TreeItem {
  issue: RestIssuable;

  workspace: GitLabWorkspace;

  constructor(issue: RestIssuable, workspace: GitLabWorkspace) {
    super(`#${issue.iid} · ${issue.title}`);
    this.issue = issue;
    this.workspace = workspace;
    this.command = {
      command: PROGRAMMATIC_COMMANDS.SHOW_RICH_CONTENT,
      arguments: [this.issue, this.workspace.uri],
      title: 'Show Issue',
    };
  }
}
