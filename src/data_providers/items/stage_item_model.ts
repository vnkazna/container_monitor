import * as vscode from 'vscode';
import { getJobMetadata } from '../../gitlab/ci_status_metadata';
import { createJobItem } from './create_job_item';
import { ItemModel } from './item_model';

/** can be passed to Array.sort method, sorts in ascending order */
const compare = <T>(a: T, b: T): -1 | 0 | 1 => {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
};
/** creates a comparison method for T objects that can be used for sorting. Can be replaced with lodash sortBy. */
const compareBy = <T>(key: keyof T) => {
  return (a: T, b: T) => compare(a[key], b[key]);
};
const first = <T>(a: T[]): T | undefined => a[0];

export class StageItemModel extends ItemModel {
  constructor(private stageName: string, private jobs: RestJob[]) {
    super();
  }

  getTreeItem(): vscode.TreeItem {
    const item = new vscode.TreeItem(this.stageName, vscode.TreeItemCollapsibleState.Expanded);
    const mostSevereStatusMetadata = first(
      this.jobs
        .map(getJobMetadata)
        .sort(compareBy('priority'))
        .reverse(),
    );
    item.iconPath = mostSevereStatusMetadata?.icon;
    item.tooltip = mostSevereStatusMetadata?.name;
    return item;
  }

  async getChildren(): Promise<vscode.TreeItem[] | ItemModel[]> {
    return this.jobs.map(createJobItem);
  }
}
