import * as vscode from 'vscode';
import { createSnippetPatch } from './create_snippet_patch';
import { project } from '../test_utils/entities';
import { asMock } from '../test_utils/as_mock';
import { createSnippet } from '../gitlab_service';
import { openUrl } from '../openers';
import { GitLabRepository } from './run_with_valid_project';

jest.mock('../git/git_extension_wrapper');
jest.mock('../gitlab_service');
jest.mock('../openers');

const SNIPPET_URL = 'https://gitlab.com/test-group/test-project/-/snippets/2146265';
const DIFF_OUTPUT = 'diff --git a/.gitlab-ci.yml b/.gitlab-ci.yml';

describe('create snippet patch', () => {
  let wrappedRepository: GitLabRepository;

  beforeEach(() => {
    const mockRepository: Partial<GitLabRepository> = {
      lastCommitSha: 'abcd1234567',
      getTrackingBranchName: async () => 'tracking-branch-name',
      getProject: async () => project,
      diff: async () => DIFF_OUTPUT,
    };
    wrappedRepository = mockRepository as GitLabRepository;
    asMock(vscode.window.showInputBox).mockResolvedValue('snippet_name');
    asMock(vscode.window.showQuickPick).mockImplementation(options =>
      options.filter((o: any) => o.type === 'private').pop(),
    );
    asMock(createSnippet).mockResolvedValue({
      web_url: SNIPPET_URL,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates a snippet patch and opens it in a browser', async () => {
    await createSnippetPatch(wrappedRepository);
    expect(openUrl).toHaveBeenCalledWith(SNIPPET_URL);
  });

  describe('populating the create snippet request', () => {
    let formData: Record<string, string>;
    beforeEach(async () => {
      await createSnippetPatch(wrappedRepository);
      [[, formData]] = asMock(createSnippet).mock.calls;
    });

    it('prepends "patch: " to the user input to create snippet title', () => {
      expect(formData.title).toBe('patch: snippet_name');
    });

    it('appends ".patch" to the user input to create snippet file name', () => {
      expect(formData.file_name).toBe('snippet_name.patch');
    });

    it("sets user's choice of visibility (private selected in test setup)", () => {
      expect(formData.visibility).toBe('private');
    });

    it('sets the diff command output as the blob content', () => {
      expect(formData.content).toBe(DIFF_OUTPUT);
    });
  });
});
