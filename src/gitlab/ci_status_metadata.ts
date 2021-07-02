import * as vscode from 'vscode';

export interface CiStatusMetadata {
  name: string;
  icon: vscode.ThemeIcon;
  priority: number;
}

const check = new vscode.ThemeIcon('pass', new vscode.ThemeColor('testing.iconPassed'));
const play = new vscode.ThemeIcon('play', new vscode.ThemeColor('debugIcon.pauseForeground'));
const pause = new vscode.ThemeIcon(
  'debug-pause',
  new vscode.ThemeColor('debugIcon.pauseForeground'),
);
const error = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconErrored'));
const circleSlash = new vscode.ThemeIcon(
  'circle-slash',
  new vscode.ThemeColor('testing.iconSkipped'),
);
const debugStepOver = new vscode.ThemeIcon(
  'debug-step-over',
  new vscode.ThemeColor('testing.iconSkipped'),
);
const question = new vscode.ThemeIcon('question', new vscode.ThemeColor('testing.iconSkipped'));
const warning = new vscode.ThemeIcon(
  'warning',
  new vscode.ThemeColor('problemsWarningIcon.foreground'),
);

const STATUS_METADATA = {
  success: { name: 'Succeeded', icon: check, priority: 1 },
  created: { name: 'Created', icon: pause, priority: 3 },
  waiting_for_resource: { name: 'Waiting for resource', icon: pause, priority: 4 },
  preparing: { name: 'Preparing', icon: pause, priority: 5 },
  pending: { name: 'Pending', icon: pause, priority: 6 },
  skipped: { name: 'Skipped', icon: debugStepOver, priority: 7 },
  canceled: { name: 'Cancelled', icon: circleSlash, priority: 8 },
  failed: { name: 'Failed', icon: error, priority: 9 },
  running: { name: 'Running', icon: play, priority: 10 },
};

const UNKNOWN_STATUS = { name: 'Status Unknown', icon: question, priority: 0 };
const FAILED_ALLOWED = { name: 'Failed (allowed to fail)', icon: warning, priority: 2 };

export const getJobMetadata = (job: RestJob): CiStatusMetadata => {
  if (job.status === 'failed' && job.allow_failure) return FAILED_ALLOWED;
  return STATUS_METADATA[job.status] || UNKNOWN_STATUS;
};

export const getPipelineMetadata = (pipeline: RestPipeline): CiStatusMetadata => {
  return STATUS_METADATA[pipeline.status] || UNKNOWN_STATUS;
};
