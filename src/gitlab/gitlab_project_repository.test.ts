import { project } from '../test_utils/entities';
import { detectProjects } from './gitlab_project_repository';

describe('gitlab_project_repository', () => {
  describe('detectProjects', () => {
    const defaultCredentials = { instanceUrl: 'https://gitlab.com', token: 'abc' };
    const extensionRemoteUrl = 'git@gitlab.com/gitlab-org/gitlab-vscode-extension';

    it('detects projects', async () => {
      const [existingProject] = await detectProjects(
        [extensionRemoteUrl],
        [defaultCredentials],
        async () => project,
      );

      expect(existingProject.credentials).toEqual(defaultCredentials);
      expect(existingProject.project).toEqual(project);
      expect(existingProject.remoteUrl).toEqual(extensionRemoteUrl);
    });

    it('returns multiple projects different remotes', async () => {
      const remoteUrlB = 'git@gitlab.com/gitlab-org/gitlab';
      const [projectA, projectB] = await detectProjects(
        [extensionRemoteUrl, remoteUrlB],
        [defaultCredentials],
        async () => project,
      );

      expect(projectA.remoteUrl).toEqual(extensionRemoteUrl);
      expect(projectB.remoteUrl).toEqual(remoteUrlB);
    });

    it('returns one project for each credentials', async () => {
      const secondCredentials = { instanceUrl: 'https://gitlab.com', token: 'def' };
      const [projectA, projectB] = await detectProjects(
        [extensionRemoteUrl],
        [defaultCredentials, secondCredentials],
        async () => project,
      );

      expect(projectA.credentials).toEqual(defaultCredentials);
      expect(projectB.credentials).toEqual(secondCredentials);
    });

    it('only returns projects that exist on the instance', async () => {
      const remoteUrlB = 'git@gitlab.com/gitlab-org/gitlab';
      const [projectA, projectB] = await detectProjects(
        [extensionRemoteUrl, remoteUrlB],
        [defaultCredentials],
        async (_, namespaceWithPath) =>
          namespaceWithPath === 'gitlab-org/gitlab' ? project : undefined,
      );

      expect(projectA.remoteUrl).toEqual(remoteUrlB);
      expect(projectB).toBeUndefined();
    });

    it('uses remoteUrl only once', async () => {
      const projects = await detectProjects(
        [extensionRemoteUrl, extensionRemoteUrl],
        [defaultCredentials],
        async () => project,
      );

      expect(projects).toHaveLength(1);
    });
  });
});
