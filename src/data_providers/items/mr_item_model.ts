import * as vscode from 'vscode';
import { PROGRAMMATIC_COMMANDS } from '../../command_names';
import { createGitLabNewService } from '../../service_factory';
import { ChangedFileItem } from './changed_file_item';
import { ItemModel } from './item_model';
import { GqlDiscussion, GqlTextDiffDiscussion } from '../../gitlab/gitlab_new_service';
import { handleError } from '../../log';
import { UserFriendlyError } from '../../errors/user_friendly_error';
import { GitLabCommentThread } from '../../review/gitlab_comment_thread';
import { REVIEW_URI_SCHEME } from '../../constants';
import { fromReviewUri } from '../../review/review_uri';
import {
  getAddedLinesFromDiff,
  getFileDiff,
  getRemovedLinesFromDiff,
} from '../../review/get_added_lines_from_diff';
import { MrModel } from '../../review/MrModel';

const isTextDiffDiscussion = (discussion: GqlDiscussion): discussion is GqlTextDiffDiscussion => {
  const firstNote = discussion.notes.nodes[0];
  return firstNote?.position?.positionType === 'text';
};

export class MrItemModel extends ItemModel {
  constructor(readonly mrModel: MrModel, readonly workspace: GitLabWorkspace) {
    super();
  }

  getTreeItem(): vscode.TreeItem {
    const { iid, title, author } = this.mrModel.mr;
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
      arguments: [this.mrModel.mr, this.workspace.uri],
      title: 'Show MR',
    };
    const gitlabService = await createGitLabNewService(this.workspace.uri);
    const mrVersion = await this.mrModel.getVersion();
    const commentRangeProvider: vscode.CommentingRangeProvider = {
      provideCommentingRanges: (
        document: vscode.TextDocument,
        token: vscode.CancellationToken,
      ): vscode.Range[] => {
        const { uri } = document;
        if (uri.scheme !== REVIEW_URI_SCHEME) {
          return [];
        }
        const params = fromReviewUri(uri);
        if (
          params.mrId !== this.mrModel.mr.id ||
          params.projectId !== this.mrModel.mr.project_id ||
          !params.path
        ) {
          return [];
        }
        const oldFile = params.commit === mrVersion.base_commit_sha;
        if (oldFile) {
          return [
            new vscode.Range(
              new vscode.Position(0, 0),
              new vscode.Position(document.lineCount - 1, 0),
            ),
          ];
          // this would only allow commenting on the changed lines:
          //
          // const fileDiff = getFileDiff(mrVersion, oldFile, params.path);
          // const result = getRemovedLinesFromDiff(fileDiff!.diff);
          // return result.map(
          //   l => new vscode.Range(new vscode.Position(l - 1, 0), new vscode.Position(l - 1, 0)),
          // );
        }

        const fileDiff = getFileDiff(mrVersion, oldFile, params.path);
        const result = getAddedLinesFromDiff(fileDiff!.diff);
        return result.map(
          l => new vscode.Range(new vscode.Position(l - 1, 0), new vscode.Position(l - 1, 0)),
        );
      },
    };
    try {
      await this.getMrDiscussions(commentRangeProvider);
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
    const changedFiles = await this.getChangedFiles(mrVersion);
    return [description, ...changedFiles];
  }

  private async getMrDiscussions(
    commentRangeProvider: vscode.CommentingRangeProvider,
  ): Promise<void> {
    const gitlabService = await createGitLabNewService(this.workspace.uri);

    const discussionResult = await gitlabService.getDiscussions({
      issuable: this.mrModel.mr,
      includePosition: true,
    });
    const commentController = vscode.comments.createCommentController(
      this.mrModel.mr.references.full,
      this.mrModel.mr.title,
    );
    if (discussionResult.userCanCreateNote) {
      commentController.commentingRangeProvider = commentRangeProvider;
    }
    const discussionsOnDiff = discussionResult.discussions.filter(isTextDiffDiscussion);
    const threads = discussionsOnDiff.map(discussion => {
      return GitLabCommentThread.createThread({
        commentController,
        workspaceFolder: this.workspace.uri,
        mr: this.mrModel.mr,
        discussion,
        gitlabService,
      });
    });
    this.setDisposableChildren([...threads, commentController]);
  }

  private async getChangedFiles(mrVersion: RestMrVersion): Promise<vscode.TreeItem[]> {
    return mrVersion.diffs.map(
      d => new ChangedFileItem(this.mrModel.mr, mrVersion, d, this.workspace),
    );
  }
}
