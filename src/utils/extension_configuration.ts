import * as vscode from 'vscode';
import { CONFIG_NAMESPACE } from '../constants';
import { CustomQuery } from '../gitlab/custom_query';

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

export function getExtensionConfiguration(): ExtensionConfiguration {
  const workspaceConfig = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  return {
    instanceUrl: turnNullToUndefined(workspaceConfig.instanceUrl),
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
