# Release process

You need to perform the following steps to release a new version of the extension (examples use `3.0.0` version):

1. Do "sanity check" testing of the extension in your local development. At this stage, you are only making sure that there is no complete failure of the extension.
1. Perform the following two changes:
   1. Make sure that the `CHANGELOG.md` contains full information for the release (version, date, changes)([example](https://gitlab.com/gitlab-org/gitlab-vscode-extension/-/blob/master/CHANGELOG.md#v300-2020-06-25)) and commit `git commit -m "Prepare changelog for 3.0.0"`
   1. Update the package version in `npm version 3.0.0`
1. `git push origin master` and `git push --tags`
1. Trigger the "publish" step on the tag pipeline.
1. When the extension updates in your VS Code, do another sanity check.
