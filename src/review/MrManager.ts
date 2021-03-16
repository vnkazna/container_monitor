import { createGitLabNewService, createGitService } from '../service_factory';
import { MrRepository } from './MrRepository';

export class MrManager {
  mrRepositories = new Map<string, MrRepository>();

  async getMrRepository(workspaceFolder: string): Promise<MrRepository> {
    const existingRepository = this.mrRepositories.get(workspaceFolder);
    if (existingRepository) {
      return existingRepository;
    }
    const gitService = await createGitService(workspaceFolder);
    const gitlabService = await createGitLabNewService(workspaceFolder);
    const result = new MrRepository(gitlabService, gitService);
    await result.initialize();
    this.mrRepositories.set(workspaceFolder, result);
    return result;
  }
}

export const mrManager = new MrManager();
