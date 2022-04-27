import { ValidBranchState, CurrentBranchRefresher } from './current_branch_refresher';
import { asMock } from './test_utils/as_mock';
import { pipeline, mr, issue, job, projectInRepository } from './test_utils/entities';
import { getGitLabService } from './gitlab/get_gitlab_service';
import { getTrackingBranchName } from './git/get_tracking_branch_name';

jest.mock('./gitlab/get_gitlab_service');
jest.mock('./git/get_tracking_branch_name');

describe('CurrentBranchRefrehser', () => {
  describe('invalid state', () => {
    it('returns invalid state if the current repo does not contain GitLab project', async () => {
      const state = await CurrentBranchRefresher.getState(undefined, false);
      expect(state.valid).toBe(false);
    });

    it('returns invalid state if fetching the mr and pipelines fails', async () => {
      asMock(getGitLabService).mockReturnValue({
        getPipelineAndMrForCurrentBranch: () => Promise.reject(new Error()),
      });
      asMock(getTrackingBranchName).mockResolvedValue('branch');
      const state = await CurrentBranchRefresher.getState(projectInRepository, false);
      expect(state.valid).toBe(false);
    });
  });

  describe('valid state', () => {
    beforeEach(() => {
      asMock(getGitLabService).mockReturnValue({
        getMrClosingIssues: () => [{ iid: 123 }],
        getSingleProjectIssue: () => issue,
        getPipelineAndMrForCurrentBranch: () => ({ pipeline, mr }),
        getJobsForPipeline: () => [job],
      });
      asMock(getTrackingBranchName).mockResolvedValue('branch');
    });

    it('returns valid state if GitLab service returns pipeline and mr', async () => {
      const state = await CurrentBranchRefresher.getState(projectInRepository, false);

      expect(state.valid).toBe(true);
      expect((state as ValidBranchState).pipeline).toEqual(pipeline);
      expect((state as ValidBranchState).mr).toEqual(mr);
      expect((state as ValidBranchState).issues).toEqual([issue]);
    });
  });
});
