import assert from 'assert';
import { Repository } from '../api/git';

export const getTrackingBranchName = async (rawRepository: Repository): Promise<string> => {
  const branchName = rawRepository.state.HEAD?.name;
  assert(
    branchName,
    'The repository seems to be in a detached HEAD state. Please checkout a branch.',
  );
  const trackingBranch = await rawRepository
    .getConfig(`branch.${branchName}.merge`)
    .catch(() => ''); // the tracking branch is going to be empty most of the time, we'll swallow the error instead of logging it every time

  return trackingBranch.replace('refs/heads/', '') || branchName;
};
