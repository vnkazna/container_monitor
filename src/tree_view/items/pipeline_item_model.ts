import * as vscode from 'vscode';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { getPipelineMetadata } from '../../gitlab/ci_status_metadata';
import { openInBrowserCommand } from '../../utils/open_in_browser_command';
import { ItemModel } from './item_model';
import { StageItemModel } from './stage_item_model';
import { compareBy } from '../../utils/compare_by';

dayjs.extend(relativeTime);
/** removes duplicates based on === equality. Can be replaced with lodash. */
const uniq = <T>(duplicated: T[]): T[] => [...new Set(duplicated)];

const getUniqueStages = (jobs: RestJob[]): string[] => uniq(jobs.map(j => j.stage));

export class PipelineItemModel extends ItemModel {
  constructor(private pipeline: RestPipeline, private jobs: RestJob[]) {
    super();
  }

  getTreeItem(): vscode.TreeItem {
    const timeAgo = dayjs(this.pipeline.updated_at).fromNow();
    const label = `Pipeline #${this.pipeline.id}`;
    const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.Expanded);
    const statusMetadata = getPipelineMetadata(this.pipeline);
    item.tooltip = `${label} · ${statusMetadata.name} · ${timeAgo}`;
    item.description = statusMetadata.name;
    item.iconPath = statusMetadata.icon;
    item.command = openInBrowserCommand(this.pipeline.web_url);
    return item;
  }

  async getChildren(): Promise<ItemModel[]> {
    const jobsAsc = this.jobs.sort(compareBy('id'));
    const stages = getUniqueStages(jobsAsc);
    const stagesWithJobs = stages.map(stageName => ({
      name: stageName,
      jobs: jobsAsc.filter(j => j.stage === stageName),
    }));
    return stagesWithJobs.map(sj => new StageItemModel(sj.name, sj.jobs));
  }
}
