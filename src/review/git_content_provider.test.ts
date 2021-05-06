import { mocked } from 'ts-jest/utils';
import { GitContentProvider } from './git_content_provider';
import { GitService } from '../git_service';
import { ApiContentProvider } from './api_content_provider';
import { toReviewUri } from './review_uri';

jest.mock('../git_service');
jest.mock('./api_content_provider');

describe('GitContentProvider', () => {
  const gitContentProvider = new GitContentProvider();

  const reviewUriParams = {
    commit: 'abcdef',
    path: '/review',
    projectId: 1234,
    mrId: 2345,
    workspacePath: 'path/to/workspace',
  };

  let getFileContent: jest.Mock;

  beforeEach(() => {
    getFileContent = jest.fn();
    const gitService = new GitService({ repositoryRoot: 'folder' });
    gitService.getFileContent = getFileContent;
    mocked(GitService).mockReturnValue(gitService);
  });

  it('provides file content from a git repository', async () => {
    getFileContent.mockReturnValue('Test text');

    const result = await gitContentProvider.provideTextDocumentContent(
      toReviewUri(reviewUriParams),
      null as any,
    );
    expect(result).toBe('Test text');
  });

  it('falls back to the API provider if file does not exist in the git repository', async () => {
    getFileContent.mockReturnValue(null);

    const apiContentProvider = new ApiContentProvider();
    apiContentProvider.provideTextDocumentContent = jest.fn().mockReturnValue('Api content');
    mocked(ApiContentProvider).mockReturnValue(apiContentProvider);

    const result = await gitContentProvider.provideTextDocumentContent(
      toReviewUri(reviewUriParams),
      null as any,
    );
    expect(result).toBe('Api content');
  });
});
