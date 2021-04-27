import * as vscode from 'vscode';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { createGitLabNewService } from '../../service_factory';
import { ChangedFileItem } from './changed_file_item';
import { ItemModel } from './item_model';
import { GqlDiscussion, GqlTextDiffDiscussion } from '../../gitlab/gitlab_new_service';
import { handleError } from '../../log';
import { UserFriendlyError } from '../../errors/user_friendly_error';
import { GitLabCommentThread } from '../../review/gitlab_comment_thread';
import { CommentingRangeProvider } from '../../review/commenting_range_provider';

const isTextDiffDiscussion = (discussion: GqlDiscussion): discussion is GqlTextDiffDiscussion => {
  const firstNote = discussion.notes.nodes[0];
  return firstNote?.position?.positionType === 'text';
};

export class MrItemModel extends ItemModel {
  constructor(readonly mr: RestIssuable, readonly workspace: GitLabWorkspace) {
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
    const overview = new vscode.TreeItem('Overview');
    overview.iconPath = new vscode.ThemeIcon('note');
    overview.command = {
      command: PROGRAMMATIC_COMMANDS.SHOW_RICH_CONTENT,
      arguments: [this.mr, this.workspace.uri],
      title: 'Show MR Overview',
    };
    const gitlabService = await createGitLabNewService(this.workspace.uri);
    const mrVersion = await gitlabService.getMrDiff(this.mr);
    try {
      await this.initializeMrDiscussions(mrVersion);
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

    const changedFiles = mrVersion.diffs.map(
      d => new ChangedFileItem(this.mr, mrVersion, d, this.workspace),
    );
    return [overview, ...changedFiles];
  }

  private async initializeMrDiscussions(mrVersion: RestMrVersion): Promise<void> {
    const commentController = vscode.comments.createCommentController(
      this.mr.references.full,
      this.mr.title,
    );
    const gitlabService = await createGitLabNewService(this.workspace.uri);

    if (await gitlabService.canUserCommentOnMr(this.mr)) {
      commentController.commentingRangeProvider = new CommentingRangeProvider(this.mr, mrVersion);
    }

    const discussions = await gitlabService.getDiscussions({
      issuable: this.mr,
    });
    const discussionsOnDiff = discussions.filter(isTextDiffDiscussion);
    const threads = discussionsOnDiff.map(discussion => {
      return GitLabCommentThread.createThread({
        commentController,
        workspaceFolder: this.workspace.uri,
        mr: this.mr,
        discussion,
        gitlabService,
      });
    });
    this.setDisposableChildren([...threads, commentController]);
  }
}
