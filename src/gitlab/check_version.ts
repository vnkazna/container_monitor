import * as vscode from 'vscode';
import { DO_NOT_SHOW_VERSION_WARNING, MINIMUM_VERSION } from '../constants';
import { GitExtensionWrapper } from '../git/git_extension_wrapper';
import { log } from '../log';
import { ifVersionGte } from './if_version_gte';

export const getVersionForEachRepo = async (
  gitExtensionWrapper: GitExtensionWrapper,
  context: vscode.ExtensionContext,
): Promise<void> => {
  const DO_NOT_SHOW_AGAIN_TEXT = 'Do not show again';

  await Promise.all(
    gitExtensionWrapper.repositories.map(async repo => {
      const repoVersion = await repo.getVersion();
      await ifVersionGte(
        repoVersion,
        MINIMUM_VERSION,
        () => undefined,
        async () => {
          const warningMessage = `This extension requires GitLab version ${MINIMUM_VERSION} or later. Repo "${repo.name}" is currently using ${repoVersion}.`;

          log(warningMessage);

          if (!context.workspaceState.get(DO_NOT_SHOW_VERSION_WARNING)) {
            const action = await vscode.window.showErrorMessage(
              warningMessage,
              DO_NOT_SHOW_AGAIN_TEXT,
            );

            if (action === DO_NOT_SHOW_AGAIN_TEXT)
              await context.workspaceState.update(DO_NOT_SHOW_VERSION_WARNING, true);
          }
        },
      );
    }),
  ).catch(error => log(error));
};
/**
 * Check that current repo version is greater than 13.5
 * If not, show dismissible error message
 */
export async function checkVersion(
  gitExtensionWrapper: GitExtensionWrapper,
  context: vscode.ExtensionContext,
): Promise<void> {
  await getVersionForEachRepo(gitExtensionWrapper, context);

  gitExtensionWrapper.onRepositoryCountChanged(() =>
    getVersionForEachRepo(gitExtensionWrapper, context),
  );
}
