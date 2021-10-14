import * as vscode from 'vscode';
import { CONFIG_NAMESPACE } from '../constants';

interface PreferredRemote {
  remoteName: string;
}
interface ExtensionConfiguration {
  instanceUrl?: string;
  remoteName?: string;
  pipelineGitRemoteName?: string;
  featureFlags?: string[];
  preferredRemotes: Record<string, PreferredRemote | undefined>;
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
