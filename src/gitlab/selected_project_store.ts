import vscode from 'vscode';
import { ProjectInRepository, SelectedProjectSetting } from './new_project';

export const convertProjectToSetting = ({
  credentials,
  project,
  pointer,
}: ProjectInRepository): SelectedProjectSetting => ({
  accountId: credentials.instanceUrl,
  namespaceWithPath: project.namespaceWithPath,
  remoteName: pointer.remote.name,
  remoteUrl: pointer.urlEntry.url,
  repositoryRootPath: pointer.repository.rootFsPath,
});

export interface SelectedProjectStore {
  addSelectedProject(selectedProject: SelectedProjectSetting): void;
  clearSelectedProjects(rootFsPath: string): void;
  readonly onSelectedProjectsChange: vscode.Event<readonly SelectedProjectSetting[]>;
  readonly selectedProjectSettings: SelectedProjectSetting[];
}

export class SelectedProjectStoreImpl implements SelectedProjectStore {
  #emitter = new vscode.EventEmitter<SelectedProjectSetting[]>();

  #selectedProjectSettings: SelectedProjectSetting[] = [];

  addSelectedProject(preferences: SelectedProjectSetting): void {
    this.#selectedProjectSettings = [...this.#selectedProjectSettings, preferences];
    this.#emitter.fire(this.#selectedProjectSettings);
  }

  clearSelectedProjects(rootFsPath: string): void {
    this.#selectedProjectSettings = this.#selectedProjectSettings.filter(
      pc => pc.repositoryRootPath !== rootFsPath,
    );
    this.#emitter.fire(this.#selectedProjectSettings);
  }

  onSelectedProjectsChange = this.#emitter.event;

  get selectedProjectSettings() {
    return this.#selectedProjectSettings;
  }
}

export const selectedProjectStore: SelectedProjectStore = new SelectedProjectStoreImpl();
