# Coding guidelines

We rely on `eslint` and `prettier` for code style. These guidelines contain a few rules that `eslint` and `prettier` tools don't enforce.

## TypeScript

- Prefer `interface` over `type` declaration when describing structures[^1].
- If you plan to implement an interface using classes, use the `I` prefix (e.g. `Car` implements `IVehicle`)[^1].
- Use `type` to define aliases for existing types, classes or interfaces, or to derive a type from another type. (e.g. `type PartialConfig = Partial<Config>`).

[^1]: [Discussion on the MR that introduced TypeScript](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/108#note_423512996)
