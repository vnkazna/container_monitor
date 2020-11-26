# Development process

This document describes how we make changes to the extension. For contributing guidelines, please see [`CONTRIBUTING.md`](../CONTRIBUTING.md).

## Who can make changes?

**Anyone** can make changes, if you are planning on larger changes impacting the extension architecture or dependencies, please [create an issue first](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/new?issuable_template=Feature%20Proposal).

## Who reviews the changes?

**Any member of the Create:Code Review team** (either [FE] or [BE]) can review a change (MR). Each MR should have at least one review. At the moment, we don't want to have any more complexity in the process. The review is mainly for knowledge sharing and sanity checking. It's not a full sign off the same way maintainer would sing off change to GitLab project.

## Who releases the changes?

Only [project maintainers] can tag a release. Follow the [release process](release-process.md).

[FE]: https://about.gitlab.com/handbook/engineering/development/dev/create-code-review-fe/
[BE]: https://about.gitlab.com/handbook/engineering/development/dev/create-code-review-be/
[project maintainers]: https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/project_members?sort=access_level_desc
