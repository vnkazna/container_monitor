import { Disposable } from 'vscode';
import { mr, pipeline, job, issue, repository } from '../test_utils/entities';
import { CurrentBranchDataProvider } from './current_branch_data_provider';
import { ItemModel } from './items/item_model';

jest.mock('./items/mr_item_model');
jest.mock('./items/pipeline_item_model');

const isItemModel = (object: any): object is ItemModel => typeof object.dispose === 'function';

describe('CurrentBranchDataProvider', () => {
  let currentBranchProvider: CurrentBranchDataProvider;

  beforeEach(() => {
    currentBranchProvider = new CurrentBranchDataProvider();
  });
  describe('disposing items', () => {
    let children: Disposable[];
    beforeEach(async () => {
      await currentBranchProvider.refresh({
        valid: true,
        mr,
        pipeline,
        jobs: [job],
        issues: [issue],
        repository,
      });
      children = (await currentBranchProvider.getChildren(undefined)).filter(isItemModel);
    });

    it('disposes previous items when we render valid state', async () => {
      children.forEach(ch => expect(ch.dispose).not.toHaveBeenCalled());
      await currentBranchProvider.getChildren(undefined);
      children.forEach(ch => expect(ch.dispose).toHaveBeenCalled());
    });

    it('disposes previous items when we render invalid state', async () => {
      children.forEach(ch => expect(ch.dispose).not.toHaveBeenCalled());
      currentBranchProvider.refresh({ valid: false });
      await currentBranchProvider.getChildren(undefined);
      children.forEach(ch => expect(ch.dispose).toHaveBeenCalled());
    });
  });
});
