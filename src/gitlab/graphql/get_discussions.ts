import { gql } from 'graphql-request';
import {
  noteDetailsFragment,
  Node,
  GqlProjectResult,
  GqlNote,
  GqlTextDiffNote,
  GqlOverviewNote,
  GqlImageNote,
} from './shared';

const discussionsFragment = gql`
  ${noteDetailsFragment}
  fragment discussions on DiscussionConnection {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      replyId
      createdAt
      resolved
      resolvable
      notes {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          ...noteDetails
        }
      }
    }
  }
`;

export const getMrDiscussionsQuery = gql`
  ${discussionsFragment}
  query GetMrDiscussions($projectPath: ID!, $iid: String!, $afterCursor: String) {
    project(fullPath: $projectPath) {
      id
      mergeRequest(iid: $iid) {
        discussions(after: $afterCursor) {
          ...discussions
        }
      }
    }
  }
`;

export const getIssueDiscussionsQuery = gql`
  ${discussionsFragment}
  query GetIssueDiscussions($projectPath: ID!, $iid: String!, $afterCursor: String) {
    project(fullPath: $projectPath) {
      id
      issue(iid: $iid) {
        discussions(after: $afterCursor) {
          ...discussions
        }
      }
    }
  }
`;

export interface GetDiscussionsQueryOptions {
  projectPath: string;
  iid: string;
  endCursor?: string;
}

interface GqlGenericDiscussion<T extends GqlNote> {
  replyId: string;
  createdAt: string;
  resolved: boolean;
  resolvable: boolean;
  notes: Node<T>;
}

export type GqlTextDiffDiscussion = GqlGenericDiscussion<GqlTextDiffNote>;

export type GqlDiscussion =
  | GqlGenericDiscussion<GqlTextDiffNote>
  | GqlGenericDiscussion<GqlImageNote>
  | GqlGenericDiscussion<GqlOverviewNote>;

interface GqlDiscussionsProject {
  mergeRequest?: {
    discussions: Node<GqlDiscussion>;
  };
  issue?: {
    discussions: Node<GqlDiscussion>;
  };
}

export type GetDiscussionsQueryResult = GqlProjectResult<GqlDiscussionsProject>;