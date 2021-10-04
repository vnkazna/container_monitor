import { Disposable } from 'vscode';
import { mr, pipeline, job, issue, repository } from '../test_utils/entities';
import { CurrentBranchDataProvider } from './current_branch_data_provider';
import { ItemModel } from './items/item_model';

jest.mock('./items/mr_item_model');
jest.mock('./items/pipeline_item_model');

const isItemModel = (object: any): object is ItemModel => typeof object.dispose === 'function';
const testState = {
  valid: true,
  mr,
  pipeline,
  jobs: [job],
  issues: [issue],
  repository,
  userInitiated: true,
};

describe('CurrentBranchDataProvider', () => {
  let currentBranchProvider: CurrentBranchDataProvider;
  let pipelineItem: Disposable;
  let mrItem: Disposable;

  beforeEach(async () => {
    currentBranchProvider = new CurrentBranchDataProvider();
    await currentBranchProvider.refresh(testState);
    [pipelineItem, mrItem] = (await currentBranchProvider.getChildren(undefined)).filter(
      isItemModel,
    );
  });

  describe('disposing items', () => {
    it('dispose is not called before refresh', () => {
      expect(pipelineItem.dispose).not.toHaveBeenCalled();
      expect(mrItem.dispose).not.toHaveBeenCalled();
    });

    it('disposes previous items when we render valid state', async () => {
      await currentBranchProvider.getChildren(undefined);
      expect(pipelineItem.dispose).toHaveBeenCalled();
      expect(mrItem.dispose).toHaveBeenCalled();
    });

    it('disposes previous items when we render invalid state', async () => {
      currentBranchProvider.refresh({ valid: false });
      await currentBranchProvider.getChildren(undefined);
      expect(pipelineItem.dispose).toHaveBeenCalled();
      expect(mrItem.dispose).toHaveBeenCalled();
    });

    it('does not dispose mr item if the refresh is not user initiated', async () => {
      currentBranchProvider.refresh({ ...testState, userInitiated: false });
      await currentBranchProvider.getChildren(undefined);
      expect(mrItem.dispose).not.toHaveBeenCalled();
    });

    it('reuses the same mr item if the refresh was not user initiated', async () => {
      currentBranchProvider.refresh({ ...testState, userInitiated: false });
      const [, newMrItem] = await currentBranchProvider.getChildren(undefined);
      expect(newMrItem).toBe(mrItem);
    });
  });

  describe('MR Item', () => {
    it('reuses the same mr item if the refresh was not user initiated', async () => {
      currentBranchProvider.refresh({ ...testState, userInitiated: false });
      const [, newMrItem] = await currentBranchProvider.getChildren(undefined);
      expect(newMrItem).toBe(mrItem);
    });

    it('renders new MR item if the user initiated the refresh', async () => {
      currentBranchProvider.refresh({ ...testState, userInitiated: true });
      const [, newMrItem] = await currentBranchProvider.getChildren(undefined);
      expect(newMrItem).not.toBe(mrItem);
    });

    it('if the MR is different, even automatic (not user initiated) refresh triggers rerender', async () => {
      currentBranchProvider.refresh({
        ...testState,
        mr: { ...mr, id: 99999 },
        userInitiated: false,
      });
      const [, newMrItem] = await currentBranchProvider.getChildren(undefined);
      expect(newMrItem).not.toBe(mrItem);
    });
  });
});
