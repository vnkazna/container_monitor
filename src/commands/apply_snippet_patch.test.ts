import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import { applySnippetPatch, NO_PATCH_SNIPPETS_MESSAGE } from './apply_snippet_patch';
import {
  patchSnippet,
  testSnippet1,
  testSnippet2,
} from '../../test/integration/fixtures/graphql/snippets.js';
import { asMock } from '../test_utils/as_mock';
import { GitLabService } from '../gitlab/gitlab_service';
import { GitLabRepository } from '../git/wrapped_repository';
import { parseGitLabRemote } from '../git/git_remote_parser';

jest.mock('../git/git_extension_wrapper');

const DIFF_OUTPUT = 'diff --git a/.gitlab-ci.yml b/.gitlab-ci.yml';

describe('apply snippet patch', () => {
  let wrappedRepository: GitLabRepository;
  let gitlabService: Partial<GitLabService>;

  const getAppliedPatchContent = async () => {
    const [[patchFile]] = asMock(wrappedRepository.apply).mock.calls;
    const patchContent = await fs.readFile(patchFile);
    return patchContent.toString();
  };

  beforeEach(() => {
    gitlabService = {};
    const mockRepository: Partial<GitLabRepository> = {
      remote: parseGitLabRemote(`git@gitlab.com:gitlab-org/gitlab-vscode-extension.git`),
      getGitLabService: () => gitlabService as GitLabService,
      apply: jest.fn(),
    };
    wrappedRepository = mockRepository as GitLabRepository;
    asMock(vscode.window.withProgress).mockImplementation((_, task) => task());
    asMock(vscode.window.showQuickPick).mockImplementation(options => options[0]);
    fs.unlink = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls git apply with the selected snippet patch', async () => {
    gitlabService.getSnippets = async () => [patchSnippet];
    gitlabService.getSnippetContent = async () => DIFF_OUTPUT;

    await applySnippetPatch(wrappedRepository);

    expect(wrappedRepository.apply).toHaveBeenCalled();
    expect(await getAppliedPatchContent()).toBe(DIFF_OUTPUT);
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('shows information message when it cannot find any snippets', async () => {
    gitlabService.getSnippets = async () => [];

    await applySnippetPatch(wrappedRepository);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(NO_PATCH_SNIPPETS_MESSAGE);
  });

  it('shows information message when returned snippets are not patch snippets', async () => {
    gitlabService.getSnippets = async () => [testSnippet1, testSnippet2];

    await applySnippetPatch(wrappedRepository);

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(NO_PATCH_SNIPPETS_MESSAGE);
  });
});
