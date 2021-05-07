import { gql } from 'graphql-request';

export const getMrPermissionsQuery = gql`
  query GetMrPermissions($projectPath: ID!, $iid: String!) {
    project(fullPath: $projectPath) {
      mergeRequest(iid: $iid) {
        userPermissions {
          createNote
        }
      }
    }
  }
`;

export interface MrPermissionsQueryOptions {
  projectPath: string;
  iid: string;
}
