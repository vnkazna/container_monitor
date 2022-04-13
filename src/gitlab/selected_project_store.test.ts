import { SelectedProjectSetting } from './new_project';
import { SelectedProjectStoreImpl } from './selected_project_store';

describe('SelectedProjectStoreImpl', () => {
  let store = new SelectedProjectStoreImpl();

  const testSelectedProject: SelectedProjectSetting = {
    accountId: 'https://gitlab.com',
    namespaceWithPath: 'gitlab-org/gitlab',
    remoteName: 'origin',
    remoteUrl: 'git@gitlab.com:gitlab-org/gitlab.git',
    repositoryRootPath: '/path/to/repo',
  };

  beforeEach(() => {
    store = new SelectedProjectStoreImpl();
  });

  it('can add selected project', () => {
    store.addSelectedProject(testSelectedProject);
    expect(store.selectedProjectSettings[0]).toEqual(testSelectedProject);
  });

  it('can delete selected projects', () => {
    store.addSelectedProject(testSelectedProject);
    store.deleteSelectedProjects('/path/to/repo');
    expect(store.selectedProjectSettings).toHaveLength(0);
  });

  it('notifies when settings change', () => {
    const listener = jest.fn();
    store.onSelectedProjectsChange(listener);

    store.addSelectedProject(testSelectedProject);
    expect(listener).toHaveBeenCalledWith([testSelectedProject]);

    store.deleteSelectedProjects('/path/to/repo');
    expect(listener).toHaveBeenCalledWith([]);
  });
});
