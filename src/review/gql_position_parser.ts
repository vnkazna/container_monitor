import { GqlTextPosition } from '../gitlab/graphql/shared';

const isOld = (position: GqlTextPosition) => position.oldLine !== null;

export const pathFromPosition = (position: GqlTextPosition): string => {
  return isOld(position) ? position.oldPath : position.newPath;
};

export const commitFromPosition = (position: GqlTextPosition): string => {
  return isOld(position) ? position.diffRefs.baseSha : position.diffRefs.headSha;
};
