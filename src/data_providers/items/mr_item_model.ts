import * as vscode from 'vscode';
import * as assert from 'assert';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { toReviewUri } from '../../review/review_uri';
import { createGitLabNewService } from '../../service_factory';
import { ChangedFileItem } from './changed_file_item';
import { ItemModel } from './item_model';
import { GqlDiscussion, GqlPosition } from '../../gitlab/gitlab_new_service';
import { handleError } from '../../log';

const containsTextPosition = (discussion: GqlDiscussion): boolean => {
  const firstNote = discussion.notes.nodes[0];
  return firstNote?.position?.positionType === 'text';
};

const commentRangeFromPosition = (position: GqlPosition): vscode.Range => {
  const glLine = position.oldLine || position.newLine;
  assert(glLine, 'there is always eitehr new or old line');
  const vsPosition = new vscode.Position(glLine - 1, 0);
  return new vscode.Range(vsPosition, vsPosition);
};

export class MrItemModel extends ItemModel {
  constructor(readonly mr: RestIssuable, readonly project: VsProject) {
    super();
  }

  getTreeItem(): vscode.TreeItem {
    const { iid, title, author } = this.mr;
    const item = new vscode.TreeItem(
      `!${iid} · ${title}`,
      vscode.TreeItemCollapsibleState.Collapsed,
    );
    item.iconPath = vscode.Uri.parse(author.avatar_url);
    return item;
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    const description = new vscode.TreeItem('Description');
    description.iconPath = new vscode.ThemeIcon('note');
    description.command = {
      command: PROGRAMMATIC_COMMANDS.SHOW_RICH_CONTENT,
      arguments: [this.mr, this.project.uri],
      title: 'Show MR',
    };
    try {
      await this.getMrDiscussions();
    } catch (e) {
      handleError(e);
    }
    const changedFiles = await this.getChangedFiles();
    return [description, ...changedFiles];
  }

  private uriFromPosition(position: GqlPosition): vscode.Uri {
    const onOldVersion = Boolean(position.oldLine);
    const path = onOldVersion ? position.oldPath : position.newPath;
    const commit = onOldVersion ? position.diffRefs.baseSha : position.diffRefs.headSha;
    return toReviewUri({
      path,
      commit,
      workspacePath: this.project.uri,
      projectId: this.mr.project_id,
    });
  }

  private async getMrDiscussions(): Promise<void> {
    const commentController = vscode.comments.createCommentController(
      this.mr.references.full,
      this.mr.title,
    );

    const gitlabService = await createGitLabNewService(this.project.uri);

    const discussions = await gitlabService.getDiscussions(this.mr);
    const discussionsOnDiff = discussions.filter(containsTextPosition);
    const threads = discussionsOnDiff.map(({ notes }) => {
      const comments = notes.nodes.map(({ body, author }) => ({
        body,
        mode: vscode.CommentMode.Preview,
        author: {
          name: author.name,
          iconPath: vscode.Uri.parse(author.avatarUrl),
        },
      }));
      const position = notes.nodes[0]?.position as GqlPosition; // we filtered out all discussions without position
      const thread = commentController.createCommentThread(
        this.uriFromPosition(position),
        commentRangeFromPosition(position),
        comments,
      );
      thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
      thread.canReply = false;
      return thread;
    });
    this.setDisposableChildren([...threads, commentController]);
  }

  private async getChangedFiles(): Promise<vscode.TreeItem[]> {
    const gitlabService = await createGitLabNewService(this.project.uri);
    const mrVersion = await gitlabService.getMrDiff(this.mr);
    return mrVersion.diffs.map(d => new ChangedFileItem(this.mr, mrVersion, d, this.project));
  }
}
