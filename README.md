# <img src="https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/5b10b8c151a1ed3000135f54d2564af385d60105/src/assets/logo.png" width="64" align="center" /> [GitLab VS Code Extension](https://gitlab.com/gitlab-org/gitlab-vscode-extension)

[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/GitLab.gitlab-workflow.svg)](https://marketplace.visualstudio.com/items?itemName=GitLab.gitlab-workflow) [![Installs](https://vsmarketplacebadge.apphb.com/installs/GitLab.gitlab-workflow.svg)](https://marketplace.visualstudio.com/items?itemName=GitLab.gitlab-workflow) [![Downloads](https://vsmarketplacebadge.apphb.com/downloads/GitLab.gitlab-workflow.svg)](https://marketplace.visualstudio.com/items?itemName=GitLab.gitlab-workflow) [![Rating](https://vsmarketplacebadge.apphb.com/rating/GitLab.gitlab-workflow.svg)](https://marketplace.visualstudio.com/items?itemName=GitLab.gitlab-workflow)

This extension integrates GitLab to VS Code. It helps you:

- View issues.
- Create and review merge requests.
- Validate your GitLab CI configuration.
- View the status of your pipeline.
- Create and paste snippets to, and from, your editor.

## Minimum supported version

This extension supports GitLab versions 13.0 and later. Even though most of the extension's features work with older versions, we currently don't actively support GitLab instances below version 13.0.

To find your GitLab version, visit `/help` (like `https://gitlab.com/help`).

## Features

_You need to set up your access token(s) to use these features, please see [Setup](#setup) section below._

### Browse issues, review MRs

See your issues, MRs (including changed files) and other [custom search results](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/docs/user/custom-queries.md) on a dedicated panel in the VS Code sidebar. [Read more](#sidebar---details)

### Information about your branch - pipelines, MR, closing issue

See pipeline status, open MR and closing issue links in the status bar. [Read more](#status-bar---details).
This pipeline status automatically updates so you don't need to open GitLab to see your pipeline status.

Advanced pipeline actions allow you to view pipeline on GitLab, create a new pipeline, retry or cancel current pipeline. [Read more](#pipeline-actions).

![status_bar.gif](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/status-bar.gif)

### Browse a remote repository

Browse a GitLab repository directly in Visual Studio Code without cloning it. [Read more](#browse-a-repository-without-cloning).

### Commands

You can use [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) to run the commands.

- `GitLab: Search project issues (Supports filters)`. [Read more](#search-with-filters)
- `GitLab: Search project merge requests (Supports filters)`. [Read more](#search-with-filters)
- `GitLab: Project Advanced Search (Issues, MR's, commits, comments...)`. [Read more](#search-with-advanced-search)
- `GitLab: Create snippet` - Create public, internal or private snippet from entire file or selection. [Read more](#create-snippet).
- `GitLab: Insert snippet` - Insert a project snippet, supports multi-file snippets. [Read more](#insert-snippet).
- `GitLab: Compare current branch with master` - Compare your branch with master and view changes on GitLab. [Read more](#compare-with-master).
- `GitLab: Open active file on GitLab` - View active file on GitLab with highlighting active line number and selected text block. [Read more](#open-active-file).
- `GitLab: Validate GitLab CI config` - Validate GitLab CI configuration file `.gitlab-ci.yml`. [Read more](#validate-gitlab-ci-configuration).
- `GitLab: Open merge request for current branch`
- `GitLab: Show issues assigned to me` - Open issues assigned to you on GitLab.
- `GitLab: Show merge requests assigned to me` - Open MRs assigned to you on GitLab.
- `GitLab: Open current project on GitLab`
- `GitLab: Create new issue on current project`
- `GitLab: Create new merge request on current project` - Open the merge request page to create a merge request.
- `GitLab: Open Remote Repository` - Browse a remote GitLab repository. [Read more](#browse-a-repository-without-cloning).

Commands this extension extends/integrates with:

- `Git: Clone` - Search for and clone projects for every GitLab instance you set up. [Read more](#git-extension-integration), [Official Documentation](https://code.visualstudio.com/docs/editor/versioncontrol#_cloning-a-repository)
- `Git: Add Remote...` - Add existing projects as remote from every GitLab instance you set up.

### Other features

Supports multiple GitLab instances [Read more](#multiple-gitlab-instances).

Published also on [Open VSX Registry](https://open-vsx.org/extension/GitLab/gitlab-workflow).

You can use [autocompletion of GitLab CI variables](#ci-variable-autocompletion) in your `.gitlab-ci.yml` pipeline file. If you have additional pipeline files you would like to use autocomplete with, it matches on any file beginning with `.gitlab-ci` and ending with `.yml` or `.yaml`. For example: `.gitlab-ci.production.yml`.

## Setup

To use this extension, you need to create a GitLab Personal Access Token and give it to the extension.

### Step 1: Create your Personal Access Token

- If you are using
  - GitLab.com [click to open Personal Access Tokens page](https://gitlab.com/-/profile/personal_access_tokens).
  - Self-managed GitLab instance go to **Settings** and select **Access Tokens** on the left navigation menu
- On **Add a personal access token** form:
  - Give a name to your token.
  - Select an expiry date.
  - Select `api` and `read_user` permissions.
  - Select **Create personal access token**.
- Copy the token. _Remember you won't be able to see the value of this token ever again for security reasons._

### Step 2: Add token to GitLab Workflow Extension

- Open up Command Palette by pressing `Cmd+Shift+P`.
- Search for "GitLab: Set GitLab Personal Access Token" and hit Enter.
- Enter the URL to the GitLab instance the PAT should apply to and hit Enter.
- Extension will ask for your PAT. Paste your PAT and hit Enter. _It won't be visible and accessible to others._
- If you want to connect to GitLab hosted on a custom domain, additionally set
  `gitlab.instanceUrl` in your user or workspace settings, otherwise the extension
  will try to connect to gitlab.com. See [Extension settings](#extension-settings) for more information.

That's it. 🏁

You can start using this extension right away. If your project has a pipeline for last commit and a MR from your current branch, you should see them on VS Code status bar. 🎉

### Multiple GitLab instances

If you want to use multiple GitLab instances you may want to configure each workspace separately. See the `gitlab.instanceUrl` configuration option in [Extension settings](#extension-settings) section.

### Self-Signed Certificate Authority (CA)

If your GitLab uses Self-Signed CA, please see [the SSL setup guide](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/docs/user/ssl.md).

## Extension settings

To learn how to change the VS Code Settings, read the official [Settings documentation](https://code.visualstudio.com/docs/getstarted/settings).

**`gitlab.instanceUrl`** _(required: false, default: "https://gitlab.com")_

If you are using GitLab on a custom domain, you must add this to your user settings file. Example: `"gitlab.instanceUrl": "https://my-gitlab-domain.com"`

To enable GitLab Workflow extension to work with different GitLab instances, each token is assigned to a GitLab instance URL. For the extension to select the correct token for a specific workspace, the option [`gitlab.instanceUrl`](#extension-settings) can be used. This option can be set in the current workspace's `.vscode/settings.json` file.

**`gitlab.showStatusBarLinks`** _(required: false, default: true)_

If you don't want to see GitLab-related links on the status bar, you can set this option to `false`. If you are using version 1.0.0 or later, you can also find the same links in sidebar. You should restart VS Code after updating this option.

**`gitlab.showIssueLinkOnStatusBar`** _(required: false, default: true)_

If you are not using the GitLab issue tracker, you can set this option to `false` to remove related issue links on the status bar. You should restart VS Code after updating this option.

**`gitlab.showMrStatusOnStatusBar`** _(required: false, default: true)_

You can toggle visibility of the merge request link in your sidebar. You can always find a merge request link in GitLab Workflow sidebar. You should restart VS Code after updating this option.

**`gitlab.pipelineGitRemoteName`** _(required: false, default: null)_

The name of the Git remote name corresponding to the GitLab repository with your pipelines. If set to `null` or missing, then the extension uses the same remote as for the non-pipeline features.

**`gitlab.customQueries`** _(required: false)_

Defines the search queries that retrieves the items shown on the GitLab Panel. See [Custom Queries documentation](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/docs/user/custom-queries.md) for more details.

### Self-signed certificates

To use self-signed certificates to connect to your GitLab instance, configure them using the following settings. These are community contributed because the GitLab team uses a public CA.

These settings don't work with [`http.proxy` setting for VS Code](https://code.visualstudio.com/docs/setup/network#_legacy-proxy-server-support) (see [open issue](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/issues/314)).

**`gitlab.ca`** _(required: false, default: null)_

*Deprecated. Please see [the SSL setup guide](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/docs/user/ssl.md) for more information on how to set up your self-signed CA.*

**`gitlab.cert`** _(required: false, default: null)_

**Unsupported** - See [&6244](https://gitlab.com/groups/gitlab-org/-/epics/6244). *If your self-managed GitLab instance requires a custom cert/key pair you would probably need to set this option in to point your certificate file. Please also see `gitlab.certKey` option.*

**`gitlab.certKey`** _(required: false, default: null)_

**Unsupported** - See [&6244](https://gitlab.com/groups/gitlab-org/-/epics/6244). *If your self-managed GitLab instance requires a custom cert/key pair you would probably need to set this option in to point your certificate key file. Please also see `gitlab.cert` option.*

**`gitlab.ignoreCertificateErrors`** _(required: false, default: false)_

**Unsupported** - See [&6244](https://gitlab.com/groups/gitlab-org/-/epics/6244). *If you are using a self-managed GitLab instance with no SSL certificate or having certificate issues and unable to use the extension you may want to set this option to `true` to ignore certificate errors.*

## Features in-depth

### Issue and Merge Request details and comments in VS Code

![Issues in Visual Studio Code](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/issues-in-vscode.png)

GitLab Workflow allows you to view issue details and comments right in the VS Code. Click an issue link from the sidebar and VS Code will open a new tab to show the issue details. You can also comment on the issue from VS Code.

You can use [GitLab Slash Commands](https://docs.gitlab.com/ee/integration/slash_commands.html) to perform actions directly from VS Code. For example, to assign an issue to `@fatihacet`, simply add a comment `/assign @fatihacet` inside VS Code.

#### Merge Request Reviews

GitLab Workflow enables you to review merge requests directly inside the editor:

![Animated gif showing how to review a merge request](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/diff-comments.gif)

1. In the left-hand sidebar, go to **Issues and Merge Requests**.
1. Select the appropriate merge request filter to view a list of merge requests.
1. Expand a relevant merge request to view the description and files changed.
1. Select a file to open it, and view the diff.

From the diff, you can:

- Review and create discussions.
- Resolve and unresolve these discussions.
- Delete and edit individual comments.

### Sidebar - details

Extension will add a GitLab Workflow panel to sidebar of VS Code. The dedicated panel will allow you to see the list of your issues and MRs (you can decide the exact queries by using the [custom queries](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/docs/user/custom-queries.md)). Also you will be able to see pipeline, MR and issue links for your current branch.

You can see the issue and MR details by clicking on the issue item or by expanding the MR item and clicking on "Description". When you expand the MR, you can see all the changed files. When you click on a changed file, the extension opens the MR diff.

![_sidebar.gif](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/sidebar.gif)

### Pipeline actions

One of the real power features of this extension is pipeline actions. This feature can be accessible from the status bar by clicking the pipeline status text or command palette and allows you to,

- View the latest pipeline on GitLab
- Create a new pipeline for your current branch
- Retry the last pipeline
- Cancel the last pipeline

![_pipeline_actions.gif](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/pipeline_actions.gif)

### Status bar - details

If your current project is a GitLab project, the extension will do the following things:

- Fetch pipeline of the last commit and show it on the status bar. Clicking this item will open the pipeline actions menu.
- Show open MR for current branch and show it on the status bar. Clicking this item will open MR on GitLab.
- Fetch closing issue of that MR and show it on the status bar. Clicking this item will open Issue on GitLab.

### Search

GitLab Workflow extension provides you two types of search. Search with filters and Advanced Search.

#### Search with filters

It allows users to search issues/MRs against their title and description fields. In the search input, you can type your search term and hit Enter, for example, `Inconsistent line endings for HEX files` or `Pipelines should ignore retried builds`.

It can become more powerful by allowing you to filter issues/MRs by author, assignee, milestone, title etc. Below is the full list of supported filter tokens

| Token     | Description                                                                                                                             | Example                                                            |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| title     | Search issues/MRs against their title and description. You don't need to add quotes around multiple words. See Important notes section. | discussions refactor                                               |
| labels    | Comma separated label list for multiple labels.                                                                                         | `labels: frontend, Discussion, performance`                        |
| label     | To search with a single label. You can also have multiple `label` tokens.                                                               | `label: frontend` or `label:frontend label: Discussion`            |
| milestone | Milestone title without `%`.                                                                                                            | `milestone: 9.5`                                                   |
| scope     | Searches issues/MRs for the given scope. Values can be `created-by-me`, `assigned-to-me` or `all`. Defaults to `created-by-me`.         | `scope: created-by-me` or `scope: assigned-to-me` or `scope: all`. |
| author    | Username of the author without `@`.                                                                                                     | `author: fatihacet`                                                |
| assignee  | Username of the assignee without `@`.                                                                                                   | `assignee: timzallmann`                                            |

**Examples**

- `title: new merge request widget author: fatihacet assignee: jschatz1 labels: frontend, performance milestone: 10.5`
- `title: multiple group page author: annabeldunstone assignee: timzallmann label: frontend`

**Important notes**

- `:` after the token name is necessary. `label :` is not a valid token name and may return parsing error. Hence `label:` should be used. However, space after the token name is optional. Both `label: frontend` and `label:frontend` is valid. This rule is valid for all tokens above.
- You don't need to add quotes around multiple words for `title` token. `title:"new merge request widget"` may return parsing error. `title: new merge request widget` should be used.
- You can have `labels` and `label` tokens at the same time. `labels: fronted discussion label: performance` is a valid query and all labels will be included in your search query. It's equal with `labels: fronted discussion performance`. You can also have multiple `label` tokens. `label: frontend label: discussion label: performance` is valid and equals to `labels: fronted discussion performance`.

![Advanced search](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/advanced-search.gif)

#### Search with Advanced Search

GitLab provides [Advanced Search feature which is backed by Elasticsearch](https://docs.gitlab.com/ee/integration/elasticsearch.html). Please see [Advanced Search syntax](https://docs.gitlab.com/ee/user/search/advanced_search_syntax.html) for more details.

### Create snippet

You can create a snippet from selection or entire file. You can also select visibility level of your snippet.

![_create-snippet.gif](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/create-snippet.gif)

### Insert snippet

You can insert public and private project snippets. The insert supports [multi-file snippets](https://docs.gitlab.com/ee/user/snippets.html#multiple-files-by-snippet).

![insert-multi-file-snippet](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/insert-multi-file-snippet.gif)

### Create and apply snippet patch

Creating a snippet patch is a great way to suggest a multi-file change during MR review.

1. Locally check out the branch where you want to suggest changes.
1. Edit the project's code.
1. Run command `GitLab: Create snippet patch`. This stores the result of the `git diff` command in a GitLab snippet in your project.
1. VS Code opens a GitLab web page with the snippet patch. The snippet's description contains instructions on how to apply the patch.
1. Other team members can apply the snippet using the `GitLab: Apply snippet patch` command.

![Create and apply snippet patch](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/snippet-patch.mp4)

### Compare with master

You can see changes in your branch by comparing with `master` and see them on GitLab.

![_compare-with-master.gif](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/compare-with-master.gif)

> Soon, the extension will support comparing your current branch with other branches.

### Open active file

This command allows you to see active file on GitLab. Extension sends active line number and selected text block to GitLab UI so you can see them highlighted.

![_open_active_file.gif](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/open_active_file.gif)

### Validate GitLab CI Configuration

Using this command, you can quickly validate GitLab CI configuration.

![Validate CI configuration](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/validate-ci-config.gif)

### CI variable autocompletion

Quickly find the CI variable you are looking for with the CI variable autocompletion.

![screenshot of the CI variable autocompletion](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/ci_variable_autocomplete.png)

### Clone GitLab projects

This extension integrates with the built-in Git Extension and allows you to search for and clone projects from GitLab (command `Git: Clone`).

- You can search for projects on each GitLab instance for which you [added an access-token](#step-2-add-token-to-gitlab-workflow-extension).
- Only projects where you are a **member of** are displayed.
- You can clone with SSH or HTTPS
- With HTTPS your access-token will be used for cloning the repository and fetching/pushing commits. This is also the case for all GitLab projects that are cloned manually with HTTPS and then opened in VS Code.

![Demonstration of cloning a project from gitlab.com](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/d0589878829338b64657e592f3451f1dace41cdf/docs/assets/git-clone.gif)

> Note: Using the access-token for cloning with HTTPS does not work with VS Code version 1.53.x (See [discussion](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/172#note_513068345))

### Browse a repository without cloning

With this extension, you can browse a GitLab repository without cloning it. While similar to the [GitHub Repositories](https://marketplace.visualstudio.com/items?itemName=github.remotehub) extension, remote GitLab repository browsing is **read-only**.

Prerequisite:

- You have [registered an access token](#setup) for that GitLab instance.

![browse remote repository](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/raw/c8d66e145569749bc05b6b63531eea3dfbb80edb/docs/assets/virtual-workspace.gif)

To open and browse a repository, either:

- Run the **GitLab: Open Remote Repository** command
- Select *Choose Project* option.
- Select GitLab instance, project and branch/tag that you would like to browse

Alternatively, run the **GitLab: Open Remote Repository** command and select "Enter gitlab-remote URL" option or manually add a `gitlab-remote` URL to your [workspace file](https://code.visualstudio.com/docs/editor/multi-root-workspaces#_workspace-file). For information about how to create GitLab remote URL, please see [GitLab remote URL format documentation](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/docs/user/remote-fs-url-format.md)

---

## Contribution

This extension is open source and [hosted on GitLab](https://gitlab.com/gitlab-org/gitlab-vscode-extension). Contributions are more than welcome. Feel free to fork and add new features or submit bug reports.

[A list of the great people](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/main/CONTRIBUTORS.md) who contributed this project, and made it even more awesome, is available. Thank you all! 🎉
