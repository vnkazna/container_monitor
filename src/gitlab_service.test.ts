/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
import assert from 'assert';

let extensionConfiguration = {};

jest.mock('./utils/extension_configuration', () => ({
  getExtensionConfiguration: () => extensionConfiguration,
}));

jest.mock('./utils/get_instance_url', () => ({
  getInstanceUrl: () => 'INSTANCE_URL',
}));
jest.mock('./services/token_service', () => ({
  tokenService: {
    getToken: () => 'TOKEN',
    getInstanceUrls: () => [],
  },
}));

let repository: any;

jest.mock('./git/git_extension_wrapper', () => ({
  gitExtensionWrapper: {
    getRepository: () => repository,
  },
}));

describe('fetchCurrentPipelineProject', () => {
  const TEST_PROJECT = { id: 'test' };

  let fetchCurrentPipelineProject: () => Promise<any>;

  beforeEach(() => {
    repository = { getProject: jest.fn().mockResolvedValue(TEST_PROJECT) };
    fetchCurrentPipelineProject = require('./gitlab_service').fetchCurrentPipelineProject;
  });

  it('simply calls repository.getProject() when pipelineGitRemoteName setting is not present', async () => {
    extensionConfiguration = {};

    const project = await fetchCurrentPipelineProject();

    expect(project).toEqual(TEST_PROJECT);
    expect(repository.getProject).toHaveBeenCalledWith();
  });

  it('obtains project for the pipeline remote when pipelineGitRemoteName is set', async () => {
    extensionConfiguration = {
      pipelineGitRemoteName: 'pipeline-remote',
    };
    const gitLabService = { getProject: jest.fn().mockResolvedValue(TEST_PROJECT) };
    repository = {
      getRemoteByName: jest.fn().mockReturnValue({ namespace: 'namespace', project: 'project' }),
      getGitLabService: () => gitLabService,
    };

    const project = await fetchCurrentPipelineProject();

    expect(project).toEqual(TEST_PROJECT);
    expect(repository.getRemoteByName).toHaveBeenCalledWith('pipeline-remote');
    expect(gitLabService.getProject).toHaveBeenCalledWith('namespace/project');
  });
});
