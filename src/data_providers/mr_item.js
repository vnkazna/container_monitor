const { TreeItem, TreeItemCollapsibleState } = require('vscode');
const vscode = require('vscode');
const { GitLabNewService } = require('../gitlab/gitlab_new_service');
const { createGitService } = require('../git_service_factory');
const { MrDescription } = require('./mr_description');
const { ChangedFileItem } = require('./changed_file_item');
const { ReviewCommentController } = require('../review/comment_provider');
const { getReviewUri } = require('../utils/get_review_uri');

class MrItem extends TreeItem {
  constructor(mr, projectUri) {
    super(`!${mr.iid} · ${mr.title}`, TreeItemCollapsibleState.Collapsed);
    this.mr = mr;
    this.projectUri = projectUri;
  }

  async getChildren() {
    const instanceUrl = await createGitService(this.projectUri).fetchCurrentInstanceUrl();
    const commentController = vscode.comments.createCommentController(
      'id',
      'MR comment controller',
    );
    commentController.commentingRangeProvider = new ReviewCommentController();
    const gitlabService = new GitLabNewService(instanceUrl);
    const diff = await gitlabService.getMrDiff(this.mr);
    const discussions = await gitlabService.getMrComments(
      this.mr.references.full.split('!')[0], // 😱
      String(this.mr.iid),
    );
    if (discussions) {
      discussions.forEach(d => {
        const position = d.notes.nodes[0] && d.notes.nodes[0].position;
        if (!position) return;
        const old = Boolean(position.oldLine);
        const path = old ? position.oldPath : position.newPath;
        const commit = old ? position.diffRefs.baseSha : position.diffRefs.headSha;
        const glLine = old ? position.oldLine : position.newLine;
        const vsPosition = new vscode.Position(glLine - 1);
        const comments = d.notes.nodes.map(n => {
          return {
            /**
             * The human-readable comment body
             */
            body: n.body,
            /**
             * [Comment mode](#CommentMode) of the comment
             */
            mode: vscode.CommentMode.Preview,

            /**
             * The [author information](#CommentAuthorInformation) of the comment
             */
            author: {
              name: n.author.name,
              iconPath: n.author.avatarUrl,
            },
          };
        });
        commentController.createCommentThread(
          getReviewUri({ path, commit, workspace: this.projectUri }),
          new vscode.Range(vsPosition, vsPosition),
          comments,
        );
      });
    }

    const files = diff.diffs.map(
      d =>
        new ChangedFileItem(
          d,
          this.mr,
          this.projectUri,
          diff.head_commit_sha,
          diff.base_commit_sha,
          this.projectUri,
        ),
    ); // TODO maybe use start_commit_sha?
    return [new MrDescription(this.mr, this.projectUri), ...files];
  }
}

exports.MrItem = MrItem;
