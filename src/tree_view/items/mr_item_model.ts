import * as vscode from 'vscode';
import assert from 'assert';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { ChangedFileItem } from './changed_file_item';
import { ItemModel } from './item_model';
import { GqlDiscussion, GqlTextDiffDiscussion } from '../../gitlab/graphql/get_discussions';
import { handleError } from '../../log';
import { UserFriendlyError } from '../../errors/user_friendly_error';
import { GitLabCommentThread } from '../../review/gitlab_comment_thread';
import { CommentingRangeProvider } from '../../review/commenting_range_provider';
import { WrappedRepository } from '../../git/wrapped_repository';
import { commentControllerProvider } from '../../review/comment_controller_provider';
import { GqlTextDiffNote } from '../../gitlab/graphql/shared';
import { toReviewUri } from '../../review/review_uri';
import {
  commentRangeFromPosition,
  commitFromPosition,
  pathFromPosition,
} from '../../review/gql_position_parser';
import { UnsupportedVersionError } from '../../errors/unsupported_version_error';

const isTextDiffDiscussion = (discussion: GqlDiscussion): discussion is GqlTextDiffDiscussion => {
  const firstNote = discussion.notes.nodes[0];
  return firstNote?.position?.positionType === 'text';
};

const firstNoteFrom = (discussion: GqlTextDiffDiscussion): GqlTextDiffNote => {
  const note = discussion.notes.nodes[0];
  assert(note, 'discussion should contain at least one note');
  return note;
};

const uriForDiscussion = (
  repository: WrappedRepository,
  mr: RestMr,
  discussion: GqlTextDiffDiscussion,
): vscode.Uri => {
  const { position } = firstNoteFrom(discussion);
  return toReviewUri({
    path: pathFromPosition(position),
    commit: commitFromPosition(position),
    repositoryRoot: repository.rootFsPath,
    projectId: mr.project_id,
    mrId: mr.id,
  });
};

export class MrItemModel extends ItemModel {
  private cachedChildren?: vscode.TreeItem[];

  constructor(readonly mr: RestMr, readonly repository: WrappedRepository) {
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
    item.contextValue = `mr-item-from-${this.isFromFork ? 'fork' : 'same-project'}`;
    return item;
  }

  private get overviewItem() {
    const result = new vscode.TreeItem('Overview');
    result.iconPath = new vscode.ThemeIcon('note');
    result.command = {
      command: PROGRAMMATIC_COMMANDS.SHOW_RICH_CONTENT,
      arguments: [this.mr, this.repository.rootFsPath],
      title: 'Show MR Overview',
    };
    return result;
  }

  private async getMrDiscussions(): Promise<GqlTextDiffDiscussion[]> {
    try {
      const discussions = await this.repository.getGitLabService().getDiscussions({
        issuable: this.mr,
      });
      return discussions.filter(isTextDiffDiscussion);
    } catch (e) {
      const error =
        e instanceof UnsupportedVersionError
          ? e
          : new UserFriendlyError(
              `The extension failed to preload discussions on the MR diff.
            It's possible that you've encountered
            https://gitlab.com/gitlab-org/gitlab/-/issues/298827.`,
              e,
            );
      handleError(error);
    }
    return [];
  }

  async getChildren(): Promise<vscode.TreeItem[]> {
    if (this.cachedChildren) return this.cachedChildren; // don't initialize comments twice
    const { mrVersion } = await this.repository.reloadMr(this.mr);
    const discussions = await this.getMrDiscussions();

    await this.addAllCommentsToVsCode(mrVersion, discussions);

    const allUrisWithComments = discussions.map(d =>
      uriForDiscussion(this.repository, this.mr, d).toString(),
    );
    const changedFiles = mrVersion.diffs.map(
      diff =>
        new ChangedFileItem(this.mr, mrVersion, diff, this.repository.rootFsPath, uri =>
          allUrisWithComments.includes(uri.toString()),
        ),
    );
    this.cachedChildren = [this.overviewItem, ...changedFiles];
    return this.cachedChildren;
  }

  private async addAllCommentsToVsCode(
    mrVersion: RestMrVersion,
    discussions: GqlTextDiffDiscussion[],
  ): Promise<void> {
    const gitlabService = this.repository.getGitLabService();
    const userCanComment = await gitlabService.canUserCommentOnMr(this.mr);

    const commentController = commentControllerProvider.borrowCommentController(
      this.mr.references.full,
      this.mr.title,
      userCanComment ? new CommentingRangeProvider(this.mr, mrVersion) : undefined,
    );
    this.setDisposableChildren([commentController]);

    discussions.forEach(discussion => {
      const { position } = firstNoteFrom(discussion);
      const vsThread = commentController.createCommentThread(
        uriForDiscussion(this.repository, this.mr, discussion),
        commentRangeFromPosition(position),
        // the comments need to know about the thread, so we first
        // create empty thread to be able to create comments
        [],
      );
      return new GitLabCommentThread(
        vsThread,
        discussion,
        this.repository.getGitLabService(),
        this.mr,
      );
    });
  }

  get isFromFork(): boolean {
    return this.mr.target_project_id !== this.mr.source_project_id;
  }
}
