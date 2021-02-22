# Coding guidelines

We rely on `eslint` and `prettier` for code style. These guidelines contain a few rules that `eslint` and `prettier` tools don't enforce.

## TypeScript

- Prefer `interface` over `type` declaration when describing structures[^1].
- If you plan to implement an interface using classes, use the `I` prefix (e.g. `Car` implements `IVehicle`)[^1].
- Use `type` to define aliases for existing types, classes or interfaces, or to derive a type from another type. (e.g. `type PartialConfig = Partial<Config>`).

### Utils (`src/utils`)

We try to minimize the code we put in utils. There needs to be a good justification to take a function out of its context and put it into utils. This justification is usually that it's used in many other modules.

Each file in `utils` folder must contain only one function. The file name uses snake_case, the function name uses camelCase.

Example:
| file | function | purpose |
| -- | -- | -- |
| [`get_instance_url.ts`](../src/utils/get_instance_url.ts) | `getInstanceUrl()` | takes a workspace folder and returns GitLab instance URL. this is a good util function used across the whole codebase. |
| [`ensure_absolute_avatar_url.ts`](../src/utils/ensure_absolute_avatar_url.ts) | `ensureAbsoluteAvatarUrl()` | If the `avatarUrl` is relative, it prepends GitLab `instanceUrl` to it. It's used in multiple places, but once we fully migrate to `gitlab_new_service.ts` we'll be able to remove this function from utils. |

[^1]: [Discussion on the MR that introduced TypeScript](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/108#note_423512996)
