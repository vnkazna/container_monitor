import * as vscode from 'vscode';
import { CONFIG_NAMESPACE } from '../constants';

type MutableConfigName = 'preferredRemotes';

export interface PreferredRemote {
  remoteName: string;
}
export type PreferredRemotes = Record<string, PreferredRemote | undefined>;

interface ExtensionConfiguration {
  instanceUrl?: string;
  remoteName?: string;
  pipelineGitRemoteName?: string;
  featureFlags?: string[];
  preferredRemotes: PreferredRemotes;
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
    preferredRemotes: workspaceConfig.preferredRemotes,
  };
}

export async function setExtensionConfiguration(
  name: MutableConfigName,
  value: any,
): Promise<void> {
  const workspaceConfig = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  await workspaceConfig.update(name, value);
}
