# Custom Queries

You can define custom queries in your VS Code configuration by defining a search expression in
[`settings.json`](https://code.visualstudio.com/docs/getstarted/settings#_settings-file-locations).
These expressions directly translate into items shown in the **Issues and Merge requests** section
of the [Sidebar](https://gitlab.com/gitlab-org/gitlab-vscode-extension/README.md#sidebar) of Visual Studio code.

The default custom queries are defined in the
[extension package.json](https://gitlab.com/gitlab-org/gitlab-vscode-extension/blob/c3f029555a723964789ee0a855dede3f1b3b3af2/package.json#L578-614).
When you specify the `gitlab.customQueries` setting, your definition overrides all
the default queries.

Example:

```json
{
  "gitlab.customQueries": [
    {
      "name": "Issues assigned to me",
      "type": "issues",
      "scope": "assigned_to_me",
      "noItemText": "There is no issue assigned to you.",
      "state": "opened"
    }
  ]
}
```

Each query is an entry of the JSON array. Depending on the type of entry you're querying,
the returned information can contain different types of values:

- [All query types](#for-all-queries)
- [Issues, epics, and merge requests](#issues-epics-and-merge-requests)
- [Vulnerability reports](#vulnerability-reports)

Snippets [don't support](https://docs.gitlab.com/ee/api/project_snippets.html) any
query parameters.

## For all queries

These properties can be applied to any query type.

| Parameter | Required | Default | Definition |
| --------- | -------- | ------- | ---------- |
| `name` | true | n/a | The label to show in the GitLab panel. |
| `noItemText` | false | `No items found.` | The text to show if the query returns no items. |
| `type` | false | `merge_requests` | The type of GitLab items to return. If `snippets` is selected, none of the other filters work. Epics will work only on GitLab Ultimate (or Gold). Possible values: `issues`, `merge_requests`, `epics`, `snippets`, `vulnerabilities`. |

## Issues, epics, and merge requests

| Parameter | Required | Default | Definition |
| --------- | -------- | ------- | ---------- |
| `maxResults` | false | 20 | The maximum number of results to show.|
| `orderBy` | false | `created_at` | Return entities ordered by the selected value. Possible values: `created_at`, `updated_at`, `priority`, `due_date`, `relative_position`, `label_priority`, `milestone_due`, `popularity`, `weight.` Some values are specific to issues, and some to merge requests. Read [about listing merge requests](https://docs.gitlab.com/ee/api/merge_requests.html#list-merge-requests) for more information. |
| `sort` | false | `desc` | Return issues sorted in ascending or descending order. Possible values: `asc`, `desc`. |
| `scope` | false | `all` | Return Gitlab items for the given scope. It is not applicable for epics. Possible values: `assigned_to_me`, `created_by_me`, `all`. |
| `state` | false | `opened` | Return all issues or only those matching a particular state. Possible values: `all`, `opened`, `closed`. |
| `labels` | false | `[]` | Array of label names.Gitlab item must have all labels to be returned. `None` lists all GitLab items with no labels. `Any` lists all GitLab issues with at least one label. Predefined names are case-insensitive. |
| `excludeLabels` | false | `[]` | Array of label names Gitlab item must not have to be returned. Predefined names are case-insensitive. Works only with issues. |
| `milestone` | false | n/a | The milestone title. None lists all GitLab items with no milestone. Any lists all GitLab items that have an assigned milestone. It is not applicable for epics and vulnerabilities. |
| `excludeMilestone` | false | n/a | The milestone title to exclude. Works only with issues. |
| `author` | false | n/a | Return GitLab items created by the given username. |
| `reviewer` | false | n/a | Returns GitLab merge requests assigned for review to the given username. When set to `"<current_user>"`, the extension uses the current user's username. |
| `excludeAuthor` | false | n/a | Return GitLab items not created by the given username. Works only with issues. When set to `"<current_user>"`, the extension uses the current user's username. |
| `assignee` | false | n/a | Returns GitLab items assigned to the given username. `None` returns unassigned GitLab items. `Any` returns GitLab items with an assignee. It is not applicable for epics and vulnerabilities. |
| `excludeAssignee` | false | n/a | Returns GitLab items not assigned to the given username. Works only with issues. When set to `"<current_user>"`, the extension uses the current user's username. |
| `search` | false | n/a | Search GitLab items against their title and description. |
| `excludeSearch` | false | n/a | Search GitLab items that doesn't have the search key in their title or description. Works only with issues. |
| `searchIn` | false | `all` | Modify the scope of the search attribute. It is not applicable for epics and vulnerabilities. Possible values: `all`, `title`, `description`. |
| `searchIn` | false | `all` | Modify the scope of the excludeSearch attribute. Works only with issues. Possible values: `all`, `title`, `description`. |
| `createdAfter` | false | n/a | Return GitLab items created after the given date. |
| `createdBefore` | false | n/a | Return GitLab items created before the given date.
| `updatedAfter` | false | n/a | Return GitLab items updated after the given date.
| `updatedBefore` | false | n/a | Return GitLab items updated before the given date.
| `wip` | false | `no` | Filter merge requests against their wip status. `yes` to return only WIP merge requests, `no` to return non WIP merge requests. Works only with merge requests. |
| `confidential` | false | n/a | Filter confidential or public issues. Works only with issues. |

## Vulnerability reports

Vulnerability reports don't share
[any common query parameters](https://docs.gitlab.com/ee/api/vulnerability_findings.html)
with other entry types.

| Parameter | Required | Default | Definition |
| --------- | -------- | ------- | ---------- |
| `scope` | false | `all` | Returns vulnerability findings for the given scope: all or dismissed. Defaults to dismissed. <!-- copied from https://docs.gitlab.com/ee/api/vulnerability_findings.html --> |
| `reportTypes` | false | n/a | Returns vulnerabilities belonging to specified report types. Works only with vulnerabilities. Possible values: `sast`, `dast`, `dependency_scanning`, `container_scanning`. |
| `severityLevels` | false | `all` | Returns vulnerabilities belonging to specified severity levels. Works only with vulnerabilities. Possible values: `undefined`, `info`, `unknown`, `low`, `medium`, `high`, `critical`. |
| `confidenceLevels` | false | `all` | Returns vulnerabilities belonging to specified confidence levels. Works only with vulnerabilities. Possible values: `undefined`, `ignore`, `unknown`, `experimental`, `low`, `medium`, `high`, `confirmed`. |
