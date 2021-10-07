import * as vscode from 'vscode';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getJobMetadata } from '../../gitlab/ci_status_metadata';
import { openInBrowserCommand } from '../../utils/open_in_browser_command';

dayjs.extend(relativeTime);

export const createJobItem = (job: RestJob): vscode.TreeItem => {
  const item = new vscode.TreeItem(job.name);
  const jobStatusMetadata = getJobMetadata(job);
  const displayTime = job.finished_at ?? job.started_at ?? job.created_at;
  item.iconPath = jobStatusMetadata.icon;
  item.tooltip = `${job.name} · ${jobStatusMetadata.name} · ${dayjs(displayTime).fromNow()}`;
  item.description = jobStatusMetadata.name;
  item.command = openInBrowserCommand(job.web_url);
  return item;
};
