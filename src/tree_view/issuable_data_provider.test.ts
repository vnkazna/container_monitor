import { extensionState } from '../extension_state';
import { asMock } from '../test_utils/as_mock';
import { repository } from '../test_utils/entities';
import { IssuableDataProvider } from './issuable_data_provider';

let repositories: any = [];

jest.mock('../extension_state');
jest.mock('../git/git_extension_wrapper', () => ({
  gitExtensionWrapper: {
    get repositories() {
      return repositories;
    },
  },
}));

describe('Issuable Data Provider', () => {
  let provider: IssuableDataProvider;
  beforeEach(() => {
    asMock(extensionState.isValid).mockReturnValue(true);
    provider = new IssuableDataProvider();
  });

  it('returns empty array when there are no repositories', async () => {
    repositories = [];
    expect(await provider.getChildren(undefined)).toEqual([]);
  });

  it('returns an error item if the repository does not contain GitLab project', async () => {
    repositories = [{ ...repository, getProject: () => undefined }];
    const children = await provider.getChildren(undefined);
    expect(children.length).toBe(1);
    expect((children[0] as any).label).toMatch(/Project failed to load/);
  });
});
