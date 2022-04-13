import { createRemoteUrlPointers, GitRepositoryImpl } from '../git/new_git';
import { Credentials } from '../services/token_service';
import { createFakeRepository } from '../test_utils/fake_git_extension';
import { GitLabProject } from './gitlab_project';
import { initializeAllProjects } from './gitlab_project_repository';
import { GitLabService } from './gitlab_service';
import { SelectedProjectSetting } from './new_project';

describe('gitlab_project_repository', () => {
  describe('initializeAllProjects', () => {
    const defaultCredentials = { instanceUrl: 'https://gitlab.com', token: 'abc' };
    const extensionRemoteUrl = 'git@gitlab.com/gitlab-org/gitlab-vscode-extension';

    let projects: Record<string, string[]> = {};

    const fakeGetProject: typeof GitLabService.tryToGetProjectFromInstance = async (
      credentials,
      namespaceWithPath,
    ) => {
      const namespacesWithPath = projects[`${credentials.instanceUrl}-${credentials.token}`];
      return namespacesWithPath?.includes(namespaceWithPath)
        ? ({
            namespaceWithPath,
          } as GitLabProject)
        : undefined;
    };

    const createPointers = (remotes: [string, string, string?][]) => {
      const repository = createFakeRepository({ remotes });
      const gitRepository = new GitRepositoryImpl(repository);
      return createRemoteUrlPointers(gitRepository);
    };

    beforeEach(() => {
      projects = {};
    });

    describe('with one project on the GitLab instance', () => {
      beforeEach(() => {
        projects = { 'https://gitlab.com-abc': ['gitlab-org/gitlab-vscode-extension'] };
      });

      it('initializes the simple scenario when there is one remote in one repo matching credentials', async () => {
        const pointers = createPointers([['origin', extensionRemoteUrl]]);

        const initializedProjects = await initializeAllProjects(
          [defaultCredentials],
          pointers,
          [],
          fakeGetProject,
        );

        expect(initializedProjects).toHaveLength(1);
        const [projectAndRepo] = initializedProjects;
        expect(projectAndRepo.credentials).toEqual(defaultCredentials);
        expect(projectAndRepo.project.namespaceWithPath).toEqual(
          'gitlab-org/gitlab-vscode-extension',
        );
        expect(projectAndRepo.pointer).toEqual(pointers[0]);
        expect(projectAndRepo.initializationType).toBeUndefined();
      });

      it('initializes only projects present on the GitLab instance', async () => {
        const securityRemoteUrl = 'git@gitlab.com/gitlab-org/security/gitlab-vscode-extension';
        const pointers = createPointers([
          ['origin', extensionRemoteUrl],
          ['security', securityRemoteUrl],
        ]);

        const initializedProjects = await initializeAllProjects(
          [defaultCredentials],
          pointers,
          [],
          fakeGetProject,
        );

        expect(initializedProjects).toHaveLength(1);
      });
    });

    describe('with two projects in one repository', () => {
      const securityRemoteUrl = 'git@gitlab.com/gitlab-org/security/gitlab-vscode-extension';
      const pointers = createPointers([
        ['origin', extensionRemoteUrl],
        ['security', securityRemoteUrl],
      ]);
      beforeEach(() => {
        projects = {
          'https://gitlab.com-abc': [
            'gitlab-org/gitlab-vscode-extension',
            'gitlab-org/security/gitlab-vscode-extension',
          ],
        };
      });

      it('initializes two detected projects in one repo', async () => {
        const initializedProjects = await initializeAllProjects(
          [defaultCredentials],
          pointers,
          [],
          fakeGetProject,
        );

        expect(initializedProjects).toHaveLength(2);
        const [origin, security] = initializedProjects;
        expect(origin.project.namespaceWithPath).toBe('gitlab-org/gitlab-vscode-extension');
        expect(security.project.namespaceWithPath).toBe(
          'gitlab-org/security/gitlab-vscode-extension',
        );
      });

      it('marks repo as selected if it was selected by the user', async () => {
        const selectedProjectSetting: SelectedProjectSetting = {
          accountId: defaultCredentials.instanceUrl,
          namespaceWithPath: 'gitlab-org/gitlab-vscode-extension',
          remoteName: 'origin',
          remoteUrl: extensionRemoteUrl,
          repositoryRootPath: pointers[0].repository.rootFsPath,
        };

        const initializedProjects = await initializeAllProjects(
          [defaultCredentials],
          pointers,
          [selectedProjectSetting],
          fakeGetProject,
        );

        const [origin, security] = initializedProjects;
        expect(origin.initializationType).toBe('selected');
        expect(security.initializationType).toBeUndefined();
      });
    });

    it('initializes multiple projects on multiple instances', async () => {
      const exampleRemoteUrl = 'git@example.com/example/gitlab-vscode-extension';
      const exampleCredentials: Credentials = {
        instanceUrl: 'https://example.com',
        token: 'def',
      };
      const pointers = createPointers([
        ['origin', extensionRemoteUrl],
        ['example', exampleRemoteUrl],
      ]);
      projects = {
        'https://gitlab.com-abc': ['gitlab-org/gitlab-vscode-extension'],
        'https://example.com-def': ['example/gitlab-vscode-extension'],
      };

      const initializedProjects = await initializeAllProjects(
        [defaultCredentials, exampleCredentials],
        pointers,
        [],
        fakeGetProject,
      );

      expect(initializedProjects).toHaveLength(2);
      const [origin, example] = initializedProjects;
      expect(origin.project.namespaceWithPath).toBe('gitlab-org/gitlab-vscode-extension');
      expect(example.project.namespaceWithPath).toBe('example/gitlab-vscode-extension');
    });

    it('initializes multiple projects for multiple credentials', async () => {
      const secondCredentials: Credentials = {
        instanceUrl: 'https://gitlab.com',
        token: 'def',
      };

      projects = {
        'https://gitlab.com-abc': ['gitlab-org/gitlab-vscode-extension'],
        'https://gitlab.com-def': ['gitlab-org/gitlab-vscode-extension'],
      };
      const pointers = createPointers([['origin', extensionRemoteUrl]]);

      const initializedProjects = await initializeAllProjects(
        [defaultCredentials, secondCredentials],
        pointers,
        [],
        fakeGetProject,
      );

      expect(initializedProjects).toHaveLength(2);
    });
  });
});
