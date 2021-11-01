import * as vscode from 'vscode';

export interface CiStatusMetadata {
  name: string;
  icon: vscode.ThemeIcon;
  priority: number;
}

type IconName =
  | 'pass'
  | 'play'
  | 'debug-pause'
  | 'error'
  | 'circle-slash'
  | 'debug-step-over'
  | 'question'
  | 'warning'
  | 'clock';

// colors
const successColor = 'testing.iconPassed';
const warningColor = 'problemsWarningIcon.foreground';
const errorColor = 'testing.iconErrored';
const inProgressColor = 'debugIcon.pauseForeground';
const grayColor = 'testing.iconSkipped';

const icon = (name: IconName, color: string) =>
  new vscode.ThemeIcon(name, new vscode.ThemeColor(color));

const STATUS_METADATA = {
  success: { name: 'Succeeded', icon: icon('pass', successColor), priority: 1 },
  created: { name: 'Created', icon: icon('debug-pause', grayColor), priority: 3 },
  waiting_for_resource: {
    name: 'Waiting for resource',
    icon: icon('debug-pause', inProgressColor),
    priority: 4,
  },
  preparing: { name: 'Preparing', icon: icon('debug-pause', inProgressColor), priority: 5 },
  pending: { name: 'Pending', icon: icon('debug-pause', warningColor), priority: 6 },
  scheduled: { name: 'Delayed', icon: icon('clock', grayColor), priority: 7 },
  skipped: { name: 'Skipped', icon: icon('debug-step-over', grayColor), priority: 8 },
  canceled: { name: 'Cancelled', icon: icon('circle-slash', grayColor), priority: 9 },
  failed: { name: 'Failed', icon: icon('error', errorColor), priority: 10 },
  running: { name: 'Running', icon: icon('play', inProgressColor), priority: 11 },
};

const UNKNOWN_STATUS = { name: 'Status Unknown', icon: icon('question', grayColor), priority: 0 };
const FAILED_ALLOWED = {
  name: 'Failed (allowed to fail)',
  icon: icon('warning', warningColor),
  priority: 2,
};

export const getJobMetadata = (job: RestJob): CiStatusMetadata => {
  if (job.status === 'failed' && job.allow_failure) return FAILED_ALLOWED;
  return STATUS_METADATA[job.status] || UNKNOWN_STATUS;
};

export const getPipelineMetadata = (pipeline: RestPipeline): CiStatusMetadata => {
  return STATUS_METADATA[pipeline.status] || UNKNOWN_STATUS;
};
