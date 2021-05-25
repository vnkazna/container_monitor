import { gitExtensionWrapper } from '../git/git_extension_wrapper';

export function getInstanceUrl(repositoryRoot: string): string {
  const repository = gitExtensionWrapper.getRepository(repositoryRoot);
  return repository.instanceUrl;
}
