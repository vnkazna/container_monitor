import * as gitLabService from './gitlab_service';
import { ValidBranchState, CurrentBranchRefresher } from './current_branch_refresher';
import { gitExtensionWrapper } from './git/git_extension_wrapper';
import { extensionState } from './extension_state';
import { asMock } from './test_utils/as_mock';
import { pipeline, project, mr, issue } from './test_utils/entities';

jest.mock('./gitlab_service');
jest.mock('./git/git_extension_wrapper');
jest.mock('./extension_state');

describe('CurrentBranchRefrehser', () => {
  beforeEach(() => {
    asMock(extensionState.isValid).mockReturnValue(true);
  });

  describe('invalid state', () => {
    it('returns invalid state if the current repo does not contain GitLab project', async () => {
      asMock(gitExtensionWrapper.getActiveRepository).mockReturnValue({
        rootFsPath: '/folder',
        getProject: async () => undefined,
      });
      const state = await CurrentBranchRefresher.getState(false);
      expect(state.valid).toBe(false);
    });
  });

  describe('valid state', () => {
    beforeEach(() => {
      asMock(gitExtensionWrapper.getActiveRepository).mockReturnValue({
        rootFsPath: '/folder',
        getProject: async () => project,
      });
    });

    it('fetches pipeline', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({ pipeline });

      const state = await CurrentBranchRefresher.getState(false);

      expect(state.valid).toBe(true);
      expect((state as ValidBranchState).pipeline).toEqual(pipeline);
    });

    it('fetches MR', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({ mr });
      asMock(gitLabService.fetchMRIssues).mockReturnValue([]);

      const state = await CurrentBranchRefresher.getState(false);

      expect(state.valid).toBe(true);
      expect((state as ValidBranchState).mr).toEqual(mr);
    });

    it('fetches closing issues', async () => {
      asMock(gitLabService.fetchPipelineAndMrForCurrentBranch).mockResolvedValue({ mr });
      asMock(gitLabService.fetchMRIssues).mockReturnValue([issue]);

      const state = await CurrentBranchRefresher.getState(false);

      expect(state.valid).toBe(true);
      expect((state as ValidBranchState).issues).toEqual([issue]);
    });
  });
});
