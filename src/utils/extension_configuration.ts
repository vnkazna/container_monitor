import * as vscode from 'vscode';
import { CONFIG_NAMESPACE, GITLAB_COM_URL } from '../constants';
import { CustomQuery } from '../gitlab/custom_query';
import { log, LOG_LEVEL } from '../log';
import { validateInstanceUrl } from './validate_instance_url';

type MutableConfigName = 'repositories';

export interface RepositorySettings {
  preferredRemoteName: string;
}
export type Repositories = Record<string, RepositorySettings | undefined>;

interface ExtensionConfiguration {
  instanceUrl?: string;
  remoteName?: string;
  pipelineGitRemoteName?: string;
  featureFlags?: string[];
  repositories: Repositories;
  customQueries: CustomQuery[];
}

// VS Code returns a value or `null` but undefined is better for using default function arguments
const turnNullToUndefined = <T>(val: T | null | undefined): T | undefined => val ?? undefined;

const ignoreInvalidUrl = (url: string): string | undefined => {
  const error = validateInstanceUrl(url);
  if (error) {
    log(
      `'gitlab.instanceUrl' (${url}) from settings.json is not valid: ${error}. ` +
        `The extension will use the default value ${GITLAB_COM_URL}. ` +
        `Fix the 'gitlab.instanceUrl' setting to use your GitLab instance.`,
      LOG_LEVEL.WARNING,
    );
    return undefined;
  }
  return url;
};

export function getExtensionConfiguration(): ExtensionConfiguration {
  const workspaceConfig = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  const instanceUrlSetting = turnNullToUndefined(workspaceConfig.instanceUrl as string | null);
  return {
    instanceUrl: instanceUrlSetting && ignoreInvalidUrl(instanceUrlSetting),
    remoteName: turnNullToUndefined(workspaceConfig.remoteName),
    pipelineGitRemoteName: turnNullToUndefined(workspaceConfig.pipelineGitRemoteName),
    featureFlags: turnNullToUndefined(workspaceConfig.featureFlags),
    customQueries: workspaceConfig.customQueries || [],
    repositories: workspaceConfig.repositories,
  };
}

export async function setExtensionConfiguration(
  name: MutableConfigName,
  value: any,
): Promise<void> {
  const workspaceConfig = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  await workspaceConfig.update(name, value);
}

export function getRepositorySettings(repositoryRoot: string): RepositorySettings | undefined {
  return getExtensionConfiguration().repositories[repositoryRoot];
}

export const setPreferredRemote = async (repositoryRoot: string, remoteName: string) => {
  const { repositories } = getExtensionConfiguration();
  const updatedRemotes: Repositories = {
    ...repositories,
    [repositoryRoot]: { preferredRemoteName: remoteName },
  };
  await setExtensionConfiguration('repositories', updatedRemotes);
};
