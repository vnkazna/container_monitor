import * as vscode from 'vscode';
import { CONFIG_NAMESPACE } from '../constants';
import { CustomQuery } from '../gitlab/custom_query';

interface ExtensionConfiguration {
  pipelineGitRemoteName?: string;
  featureFlags?: string[];
  customQueries: CustomQuery[];
}

// VS Code returns a value or `null` but undefined is better for using default function arguments
const turnNullToUndefined = <T>(val: T | null | undefined): T | undefined => val ?? undefined;

export function getExtensionConfiguration(): ExtensionConfiguration {
  const workspaceConfig = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  return {
    pipelineGitRemoteName: turnNullToUndefined(workspaceConfig.pipelineGitRemoteName),
    featureFlags: turnNullToUndefined(workspaceConfig.featureFlags),
    customQueries: workspaceConfig.customQueries || [],
  };
}
