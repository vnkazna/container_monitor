import * as vscode from 'vscode';
import { GraphQLClient, gql } from 'graphql-request';
import crossFetch from 'cross-fetch';
import { URL } from 'url';
import * as createHttpProxyAgent from 'https-proxy-agent';
import { tokenService } from '../services/token_service';
import { FetchError } from '../errors/fetch_error';
import { getUserAgentHeader } from '../utils/get_user_agent_header';
import { GitRemote } from '../git/git_remote_parser';

interface Node<T> {
  nodes: T[];
}

interface GraphQLProjectResult {
  project?: {
    id: string;
    snippets: Node<GraphQLSnippet>;
  };
}

export interface GraphQLSnippet {
  id: string;
  projectId: string;
  title: string;
  description: string;
  blobs: Node<GraphQLBlob>;
}

export interface GraphQLBlob {
  name: string;
  path: string;
}

interface RestMR {
  iid: number;
  project_id: number;
}

interface GraphQLMrProjectResult {
  project?: {
    mergeRequest: GraphQLMergeRequest;
  };
}

interface GraphQLMergeRequest {
  discussions: Node<GraphQlDiscussion>;
}

interface GraphQlDiscussion {
  notes: Node<GraphQlNote>;
}

interface GraphQlNote {
  body: string;
  author: GraphQlAuthor;
  position?: GraphQlPosition;
}

interface GraphQlAuthor {
  name: string;
  avatarUrl: string;
}

interface GraphQlPosition {
  diffRefs: {
    baseSha: string;
    headSha: string;
  };
  filePath: string;
  positionType: string;
  newLine?: number;
  oldLine?: number;
  newPath?: string;
  oldPath?: string;
}

const queryGetSnippets = gql`
  query GetSnippets($projectPath: ID!) {
    project(fullPath: $projectPath) {
      id
      snippets {
        nodes {
          id
          title
          description
          blobs {
            nodes {
              name
              path
            }
          }
        }
      }
    }
  }
`;

const getMrDiscussionsQuery = gql`
  query GetDiscussions($projectPath: ID!, $iid: String!) {
    project(fullPath: $projectPath) {
      mergeRequest(iid: $iid) {
        discussions {
          nodes {
            notes {
              nodes {
                body
                author {
                  name
                  avatarUrl
                }
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
                }
              }
            }
          }
        }
      }
    }
  }
`;

export class GitLabNewService {
  client: GraphQLClient;

  instanceUrl: string;

  constructor(instanceUrl: string) {
    this.instanceUrl = instanceUrl;
    const endpoint = new URL('/api/graphql', this.instanceUrl).href;
    this.client = new GraphQLClient(endpoint, this.fetchOptions);
  }

  private get fetchOptions() {
    const token = tokenService.getToken(this.instanceUrl);
    const { proxy } = vscode.workspace.getConfiguration('http');
    const agent = proxy ? createHttpProxyAgent(proxy) : undefined;
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        ...getUserAgentHeader(),
      },
      agent,
    };
  }

  async getSnippets(projectPath: string): Promise<GraphQLSnippet[]> {
    const result = await this.client.request<GraphQLProjectResult>(queryGetSnippets, {
      projectPath,
    });

    const { project } = result;
    // this can mean three things: project doesn't exist, user doesn't have access, or user credentials are wrong
    // https://gitlab.com/gitlab-org/gitlab/-/issues/270055
    if (!project) {
      throw new Error(
        `Project ${projectPath} was not found. You might not have permissions to see it.`,
      );
    }
    const snippets = project.snippets.nodes;
    // each snippet has to contain projectId so we can make REST API call for the content
    return snippets.map(sn => ({
      ...sn,
      projectId: project.id,
    }));
  }

  // TODO change this method to use GraphQL when https://gitlab.com/gitlab-org/gitlab/-/issues/260316 is done
  async getSnippetContent(snippet: GraphQLSnippet, blob: GraphQLBlob): Promise<string> {
    const projectId = snippet.projectId.replace('gid://gitlab/Project/', '');
    const snippetId = snippet.id.replace('gid://gitlab/ProjectSnippet/', '');
    const url = `${this.instanceUrl}/api/v4/projects/${projectId}/snippets/${snippetId}/files/master/${blob.path}/raw`;
    const result = await crossFetch(url, this.fetchOptions);
    if (!result.ok) {
      throw new FetchError(`Fetching snippet from ${url} failed`, result);
    }
    return result.text();
  }

  async getMrDiff(mr: RestMR) {
    const versionsResult = await crossFetch(
      `${this.instanceUrl}/api/v4/projects/${mr.project_id}/merge_requests/${mr.iid}/versions`,
      this.fetchOptions,
    );
    const versions = await versionsResult.json();
    const lastVersion = versions[0];
    const diffResult = await crossFetch(
      `${this.instanceUrl}/api/v4/projects/${mr.project_id}/merge_requests/${mr.iid}/versions/${lastVersion.id}`,
      this.fetchOptions,
    );
    return diffResult.json();
  }

  async getMrComments(projectPath: string, iid: string): Promise<GraphQlDiscussion[] | undefined> {
    const result = await this.client.request<GraphQLMrProjectResult>(getMrDiscussionsQuery, {
      projectPath,
      iid,
    });
    return result.project?.mergeRequest.discussions.nodes;
  }
}
