import vscode from 'vscode';
import { ProjectInRepository } from '../../gitlab/new_project';

export class ProjectItem extends vscode.TreeItem {
  projectInRepository: ProjectInRepository;

  constructor(projectInRepository: ProjectInRepository) {
    super(projectInRepository.project.name);
    this.projectInRepository = projectInRepository;
    this.iconPath = new vscode.ThemeIcon('project');
    this.contextValue =
      projectInRepository.initializationType === 'selected' ? 'selected-project' : '';
  }
}
