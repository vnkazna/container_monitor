import * as vscode from 'vscode';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { ChangedFileItem } from './changed_file_item';
import { ItemModel } from './item_model';
import { GqlDiscussion, GqlTextDiffDiscussion } from '../../gitlab/graphql/get_discussions';
import { handleError } from '../../log';
import { UserFriendlyError } from '../../errors/user_friendly_error';
import { GitLabCommentThread } from '../../review/gitlab_comment_thread';
import { CommentingRangeProvider } from '../../review/commenting_range_provider';
import { WrappedRepository } from '../../git/wrapped_repository';

const isTextDiffDiscussion = (discussion: GqlDiscussion): discussion is GqlTextDiffDiscussion => {
  const firstNote = discussion.notes.nodes[0];
  return firstNote?.position?.positionType === 'text';
};

export class MrItemModel extends ItemModel {
  constructor(readonly mr: RestIssuable, readonly repository: WrappedRepository) {
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
      arguments: [this.mr, this.repository.rootFsPath],
      title: 'Show MR Overview',
    };
    const { mrVersion } = await this.repository.reloadMr(this.mr);
    let urisWithComments: string[] = [];
    try {
      const threads = await this.initializeMrDiscussions(mrVersion);
      urisWithComments = threads.map(t => t.uri);
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
      d => new ChangedFileItem(this.mr, mrVersion, d, this.repository.rootFsPath, urisWithComments),
    );
    return [overview, ...changedFiles];
  }

  private async initializeMrDiscussions(mrVersion: RestMrVersion): Promise<GitLabCommentThread[]> {
    const commentController = vscode.comments.createCommentController(
      `gitlab-mr-${this.mr.references.full}`,
      this.mr.title,
    );
    this.setDisposableChildren([commentController]);

    const gitlabService = this.repository.getGitLabService();

    if (await gitlabService.canUserCommentOnMr(this.mr)) {
      commentController.commentingRangeProvider = new CommentingRangeProvider(this.mr, mrVersion);
    }

    const discussions = await gitlabService.getDiscussions({
      issuable: this.mr,
    });
    const discussionsOnDiff = discussions.filter(isTextDiffDiscussion);
    return discussionsOnDiff.map(discussion => {
      return GitLabCommentThread.createThread({
        commentController,
        repositoryRoot: this.repository.rootFsPath,
        mr: this.mr,
        discussion,
        gitlabService,
      });
    });
  }
}
