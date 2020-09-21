# Release process

You need to perform the following steps to release a new version of the extension (examples use `3.0.0` version):

1. Do "sanity check" testing of the extension in your local development. At this stage, you are only making sure that there is no complete failure of the extension.
1. Update the package version in `npm version 3.0.0` (this automatically generates a changelog)
1. If there have been community contributions, manually add attribution to the `CHANGELOG.md` and `CONTRIBUTORS.md`
   - Example: `(Implemented|Fixed) by [@flood4life](https://gitlab.com/flood4life) with [MR !90](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/merge_requests/90) 👍`
   - Add contributor's entry to `CONTRIBUTORS.md` if it doesn't exist
1. `git push origin main` and `git push --tags`
1. Trigger the "publish" step on the tag pipeline.
1. When the extension updates in your VS Code, do another sanity check.
