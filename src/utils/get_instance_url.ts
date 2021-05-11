import * as assert from 'assert';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';

export function getInstanceUrl(repositoryRoot: string): string {
  const repository = gitExtensionWrapper.getRepository(repositoryRoot);
  assert(repository, `${repositoryRoot} doesn't contain a git repository`);
  return repository.instanceUrl;
}
