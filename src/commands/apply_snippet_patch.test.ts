import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import { applySnippetPatch, NO_PATCH_SNIPPETS_MESSAGE } from './apply_snippet_patch';
import { WrappedRepository } from '../git/wrapped_repository';
import {
  patchSnippet,
  testSnippet1,
  testSnippet2,
} from '../../test/integration/fixtures/graphql/snippets.js';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { asMock } from '../test_utils/as_mock';
import { GitLabNewService } from '../gitlab/gitlab_new_service';

jest.mock('../git/git_extension_wrapper');
jest.mock('../gitlab_service');

const DIFF_OUTPUT = 'diff --git a/.gitlab-ci.yml b/.gitlab-ci.yml';

describe('apply snippet patch', () => {
  let wrappedRepository: WrappedRepository;
  let gitlabService: Partial<GitLabNewService>;

  const getAppliedPatchContent = async () => {
    const [[patchFile]] = asMock(wrappedRepository.apply).mock.calls;
    const patchContent = await fs.readFile(patchFile);
    return patchContent.toString();
  };

  beforeEach(() => {
    gitlabService = {};
    const mockRepository: Partial<WrappedRepository> = {
      remote: {
        host: 'gitlab.com',
        namespace: 'gitlab-org',
        project: 'gitlab-vscode-extension',
      },
      getGitLabService: () => gitlabService as GitLabNewService,
      apply: jest.fn(),
    };
    wrappedRepository = mockRepository as WrappedRepository;
    asMock(vscode.window.withProgress).mockImplementation((_, task) => task());
    asMock(gitExtensionWrapper.getActiveRepositoryOrSelectOne).mockResolvedValue(wrappedRepository);
    asMock(vscode.window.showQuickPick).mockImplementation(options => options[0]);
    fs.unlink = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('calls git apply with the selected snippet patch', async () => {
    gitlabService.getSnippets = async () => [patchSnippet];
    gitlabService.getSnippetContent = async () => DIFF_OUTPUT;

    await applySnippetPatch();

    expect(wrappedRepository.apply).toHaveBeenCalled();
    expect(await getAppliedPatchContent()).toBe(DIFF_OUTPUT);
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('shows information message when it cannot find any snippets', async () => {
    gitlabService.getSnippets = async () => [];

    await applySnippetPatch();

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(NO_PATCH_SNIPPETS_MESSAGE);
  });

  it('shows information message when returned snippets are not patch snippets', async () => {
    gitlabService.getSnippets = async () => [testSnippet1, testSnippet2];

    await applySnippetPatch();

    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(NO_PATCH_SNIPPETS_MESSAGE);
  });
});
