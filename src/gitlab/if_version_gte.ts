import assert from 'assert';
import { coerce, gte, valid } from 'semver';
import { log } from '../log';

export function ifVersionGte<T>(
  current: string | undefined,
  minimumRequiredVersion: string,
  then: () => T | Promise<T>,
  otherwise: () => T | Promise<T>,
): T | Promise<T> {
  assert(
    valid(minimumRequiredVersion),
    `minimumRequiredVersion argument ${minimumRequiredVersion} isn't valid`,
  );
  if (!coerce(current)) {
    log(`Could not parse version from "${current}", running logic for the latest GitLab version`);
    return then();
  }
  if (gte(coerce(current)!, minimumRequiredVersion)) return then();
  return otherwise();
}
