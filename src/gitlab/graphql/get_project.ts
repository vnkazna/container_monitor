import { gql } from 'graphql-request';
import { fragmentProjectDetails, GqlProject, GqlProjectResult } from './shared';

export const queryGetProject = gql`
  ${fragmentProjectDetails}
  query GetProject($projectPath: ID!) {
    project(fullPath: $projectPath) {
      ...projectDetails
    }
  }
`;

export interface GetProjectQueryOptions {
  projectPath: string;
}

export type GetProjectQueryResult = GqlProjectResult<GqlProject>;
