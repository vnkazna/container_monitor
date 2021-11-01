import * as vscode from 'vscode';
import dayjs from 'dayjs';
import { job } from '../../test_utils/entities';
import { createJobItem } from './create_job_item';
import { VS_COMMANDS } from '../../command_names';

const fourYearsAgo = dayjs().subtract(4, 'year').toString();
describe('item created by createJobItem', () => {
  const jobItem = createJobItem({
    ...job,
    name: 'unit test',
    status: 'failed',
    finished_at: fourYearsAgo,
  });

  it('has label', () => {
    expect(jobItem.label).toBe('unit test');
  });

  it('has icon', () => {
    expect((jobItem.iconPath as vscode.ThemeIcon).id).toBe('error');
  });

  it('has description', () => {
    expect(jobItem.description).toBe('Failed');
  });

  it('has tooltip', () => {
    expect(jobItem.tooltip).toBe('unit test · Failed · 4 years ago');
  });

  it('has "open in a browser" command attached to it', () => {
    expect(jobItem.command?.command).toBe(VS_COMMANDS.OPEN);
    expect(jobItem.command?.arguments).toEqual([vscode.Uri.parse(job.web_url)]);
  });

  describe('showing relative time', () => {
    const threeYearsAgo = dayjs().subtract(3, 'year').toString();
    const twoYearsAgo = dayjs().subtract(2, 'year').toString();

    const testJob = {
      ...job,
      created_at: fourYearsAgo,
      started_at: undefined,
      finished_at: undefined,
    };

    it('uses created_at as a last resort', () => {
      expect(createJobItem(testJob).tooltip).toMatch('4 years ago');
    });

    it('uses started_at over created_at', () => {
      expect(createJobItem({ ...testJob, started_at: threeYearsAgo }).tooltip).toMatch(
        '3 years ago',
      );
    });

    it('finished_at has highest priority', () => {
      expect(
        createJobItem({ ...testJob, finished_at: twoYearsAgo, started_at: threeYearsAgo }).tooltip,
      ).toMatch('2 years ago');
    });
  });
});
