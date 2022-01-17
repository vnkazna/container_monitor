# Coding guidelines

We rely on `eslint` and `prettier` for code style. These guidelines contain a few rules that `eslint` and `prettier` tools don't enforce.

## TypeScript

- Prefer `interface` over `type` declaration when describing structures[^1].
- Use `type` to define aliases for existing types, classes or interfaces, or to derive a type from another type. (e.g. `type PartialConfig = Partial<Config>`).

### Utils (`src/utils`)

We try to minimize the code we put in utils. There needs to be a good justification to take a function out of its context and put it into utils. This justification is usually that it's used in many other modules.

Each file in `utils` folder must contain only one function. The file name uses snake_case, the function name uses camelCase.

Example:
| file | function | purpose |
| -- | -- | -- |
| [`get_instance_url.ts`](../src/utils/get_instance_url.ts) | `getInstanceUrl()` | Takes a workspace folder and returns GitLab instance URL. this is a good util function used across the whole codebase. |
| [`find_file_in_diffs.ts`](../src/utils/find_file_in_diffs.ts) | `findFileInDiffs()` | Iterates through the GitLab API MR diff (versions) response and finds diff for a file based on a path. This is used multiple places responsible for rendering MR Reviews. |

[^1]: [Discussion on the MR that introduced TypeScript](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/108#note_423512996)
