import { commitFromPosition, pathFromPosition } from './gql_position_parser';
import { noteOnDiff } from '../../test/integration/fixtures/graphql/discussions.js';
import { GqlTextPosition } from '../gitlab/graphql/shared';

const { position } = noteOnDiff;

const oldPosition = {
  ...position,
  oldLine: 1,
  newLine: null,
  oldPath: 'oldPath.js',
  diffRefs: {
    ...position.diffRefs,
    baseSha: 'abcd',
  },
} as GqlTextPosition;

const newPosition = {
  ...position,
  oldLine: null,
  newLine: 1,
  newPath: 'newPath.js',
  diffRefs: {
    ...position.diffRefs,
    headSha: '1234',
  },
} as GqlTextPosition;

describe('pathFromPosition', () => {
  it('returns old path for old position', () => {
    expect(pathFromPosition(oldPosition)).toBe('oldPath.js');
  });
  it('returns new path for new position', () => {
    expect(pathFromPosition(newPosition)).toBe('newPath.js');
  });
});

describe('commitFromPosition', () => {
  it('returns baseSha for old position', () => {
    expect(commitFromPosition(oldPosition)).toBe('abcd');
  });
  it('returns headSha for new position', () => {
    expect(commitFromPosition(newPosition)).toBe('1234');
  });
});
