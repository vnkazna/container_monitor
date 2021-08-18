import * as vscode from 'vscode';
import { job } from '../../test_utils/entities';
import { StageItemModel } from './stage_item_model';

describe('StageItemModel', () => {
  const model = new StageItemModel('test', [
    { ...job, name: 'short task', status: 'failed' },
    { ...job, name: 'long task', status: 'running' },
  ]);
  describe('tree item', () => {
    it('has label', () => {
      expect(model.getTreeItem().label).toBe('test');
    });

    it('takes tooltip and icon after the job with highest priority (e.g. running)', () => {
      const item = model.getTreeItem();

      expect(item.tooltip).toBe('Running');
      expect((item.iconPath as vscode.ThemeIcon).id).toBe('play');
    });
  });

  describe('children', () => {
    it('returns the jobs as children', async () => {
      const children = (await model.getChildren()) as vscode.TreeItem[];
      expect(children.map(ch => ch.label)).toEqual(['short task', 'long task']);
    });
  });
});
