import * as vscode from 'vscode';
import dayjs from 'dayjs';
import { job, pipeline, repository } from '../../test_utils/entities';
import { PipelineItemModel } from './pipeline_item_model';
import { VS_COMMANDS } from '../../command_names';

jest.mock('../../gitlab_service');

const fourYearsAgo = dayjs().subtract(4, 'year');

describe('PipelineItemModel', () => {
  describe('tree item', () => {
    let item: vscode.TreeItem;
    beforeEach(() => {
      item = new PipelineItemModel(
        {
          ...pipeline,
          id: 123,
          status: 'success',
          updated_at: fourYearsAgo.toString(),
        },
        [],
        repository,
      ).getTreeItem();
    });

    it('has label', () => {
      expect(item.label).toBe('Pipeline #123');
    });

    it('has tooltip', () => {
      expect(item.tooltip).toBe('Pipeline #123 · Succeeded · 4 years ago');
    });

    it('has description', () => {
      expect(item.description).toBe('Succeeded');
    });

    it('has icon', () => {
      const iconId = (item.iconPath as vscode.ThemeIcon).id;
      expect(iconId).toBe('pass');
    });

    it('has "open in a browser" command attached to it', () => {
      expect(item.command?.command).toBe(VS_COMMANDS.OPEN);
      expect(item.command?.arguments).toEqual([vscode.Uri.parse(pipeline.web_url)]);
    });
  });

  describe('children', () => {
    let pipelineItem: PipelineItemModel;
    const unitTestJob = { ...job, stage: 'test', name: 'unit test' };
    const integrationTestJob = { ...job, stage: 'test', name: 'integration test' };
    const packageJob = { ...job, stage: 'package', name: 'package task' };

    beforeEach(() => {
      const jobs = [unitTestJob, integrationTestJob, packageJob];
      pipelineItem = new PipelineItemModel(pipeline, jobs, repository);
    });

    it('returns unique stages', async () => {
      const children = await pipelineItem.getChildren();

      const labels = children.map(ch => ch.getTreeItem()).map(i => i.label);
      expect(labels).toEqual(['test', 'package']);
    });

    it('returns stages based on job order (asc id)', async () => {
      const jobs = [
        { ...unitTestJob, id: 3 },
        { ...integrationTestJob, id: 2 },
        { ...packageJob, id: 1 },
      ];

      pipelineItem = new PipelineItemModel(pipeline, jobs, repository);
      const children = await pipelineItem.getChildren();
      const labels = children.map(ch => ch.getTreeItem()).map(i => i.label);

      expect(labels).toEqual(['package', 'test']);
    });

    it('passes jobs to each unique stage', async () => {
      const childrenModels = await pipelineItem.getChildren();

      const [testStageModel, packageStageModel] = childrenModels;
      const testJobItems = await testStageModel.getChildren();
      const packageJobItems = await packageStageModel.getChildren();
      expect(testJobItems.map((i: any) => i.label)).toEqual(['unit test', 'integration test']);
      expect(packageJobItems.map((i: any) => i.label)).toEqual(['package task']);
    });
  });
});
