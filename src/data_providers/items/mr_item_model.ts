import * as vscode from 'vscode';
import * as assert from 'assert';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { createGitLabNewService } from '../../service_factory';
import { ChangedFileItem } from './changed_file_item';
import { ItemModel } from './item_model';
import { handleError } from '../../log';
import { UserFriendlyError } from '../../errors/user_friendly_error';
import { GitLabCommentThread } from '../../review/gitlab_comment_thread';
import { toReviewUri } from '../../review/review_uri';
import { GqlPosition } from '../../gitlab/gitlab_new_service';

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
    if (author.avatar_url) {
      item.iconPath = vscode.Uri.parse(author.avatar_url);
    }
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
      handleError(
        new UserFriendlyError(
          `The extension failed to preload discussions on the MR diff.
            It's possible that you've encountered
            https://gitlab.com/gitlab-org/gitlab/-/issues/298827.`,
          e,
        ),
      );
    }
    const changedFiles = await this.getChangedFiles();
    return [description, ...changedFiles];
  }

  private async getMrDiscussions(): Promise<void> {
    const commentController = vscode.comments.createCommentController(
      this.mr.references.full,
      this.mr.title,
    );

    const gitlabService = await createGitLabNewService(this.project.uri);

    const discussions = await gitlabService.getDiscussions({
      issuable: this.mr,
      includePosition: true,
    });
    const discussionsOnDiff = discussions.filter(d =>
      GitLabCommentThread.isThreadOnDiff(d.notes.nodes),
    );
    const threads = discussionsOnDiff.map(({ notes, resolved, resolvable, replyId }) => {
      assert(notes.nodes[0]?.position);
      const threadUri = this.uriFromPosition(notes.nodes[0].position);
      return new GitLabCommentThread(commentController, gitlabService, {
        notes: notes.nodes,
        threadUri,
        resolvable,
        resolved,
        replyId,
      });
    });
    this.setDisposableChildren([...threads, commentController]);
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

  private async getChangedFiles(): Promise<vscode.TreeItem[]> {
    const gitlabService = await createGitLabNewService(this.project.uri);
    const mrVersion = await gitlabService.getMrDiff(this.mr);
    return mrVersion.diffs.map(d => new ChangedFileItem(this.mr, mrVersion, d, this.project));
  }
}
