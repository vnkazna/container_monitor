import { basename } from 'path';
import { Repository } from '../api/git';

export class WrappedRepository {
  private readonly rawRepository: Repository;

  constructor(rawRepository: Repository) {
    this.rawRepository = rawRepository;
  }

  get name(): string {
    return basename(this.rawRepository.rootUri.fsPath);
  }

  get rootFsPath(): string {
    return this.rawRepository.rootUri.fsPath;
  }

  /**
   * Compares, whether this wrapper contains repository for the
   * same folder as the method argument.
   *
   * The VS Code Git extension can produce more instances of `Repository`
   * interface for the same git folder. We can't simply compare references with `===`.
   */
  hasSameRootAs(repository: Repository): boolean {
    return this.rootFsPath === repository.rootUri.fsPath;
  }
}
