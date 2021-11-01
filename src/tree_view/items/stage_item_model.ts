import * as vscode from 'vscode';
import { getJobMetadata } from '../../gitlab/ci_status_metadata';
import { compareBy } from '../../utils/compare_by';
import { createJobItem } from './create_job_item';
import { ItemModel } from './item_model';

const first = <T>(a: T[]): T | undefined => a[0];

export class StageItemModel extends ItemModel {
  constructor(private stageName: string, private jobs: RestJob[]) {
    super();
  }

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(this.stageName, vscode.TreeItemCollapsibleState.Expanded);
    const mostSevereStatusMetadata = first(
      this.jobs.map(getJobMetadata).sort(compareBy('priority')).reverse(),
    );
    item.iconPath = mostSevereStatusMetadata?.icon;
    item.tooltip = mostSevereStatusMetadata?.name;
    return item;
  }

  async getChildren(): Promise<vscode.TreeItem[] | ItemModel[]> {
    return this.jobs.map(createJobItem);
  }
}
