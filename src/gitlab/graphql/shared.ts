import { gql } from 'graphql-request';

export const fragmentProjectDetails = gql`
  fragment projectDetails on Project {
    id
    name
    description
    httpUrlToRepo
    sshUrlToRepo
    fullPath
    webUrl
    group {
      id
    }
  }
`;

interface GqlGroup {
  id: string;
}
export interface GqlProject {
  id: string;
  name: string;
  description: string;
  httpUrlToRepo: string;
  sshUrlToRepo: string;
  fullPath: string;
  webUrl: string;
  group?: GqlGroup;
}
