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

const positionFragment = gql`
  fragment position on Note {
    position {
      diffRefs {
        baseSha
        headSha
      }
      filePath
      positionType
      newLine
      oldLine
      newPath
      oldPath
      positionType
    }
  }
`;

export const noteDetailsFragment = gql`
  ${positionFragment}
  fragment noteDetails on Note {
    id
    createdAt
    system
    author {
      avatarUrl
      name
      username
      webUrl
    }
    body
    bodyHtml
    userPermissions {
      resolveNote
      adminNote
      createNote
    }
    ...position
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
