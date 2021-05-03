import { Repository } from '../api/git';

export class WrappedRepository {
  rawRepository: Repository;

  constructor(rawRepository: Repository) {
    this.rawRepository = rawRepository;
  }

  get rootFsPath(): string {
    return this.rawRepository.rootUri.fsPath;
  }
}
