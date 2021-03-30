import * as https from 'https';
import { GraphQLClient, gql } from 'graphql-request';
import crossFetch from 'cross-fetch';
import { URL } from 'url';
import * as createHttpProxyAgent from 'https-proxy-agent';
import * as assert from 'assert';
import { tokenService } from '../services/token_service';
import { FetchError } from '../errors/fetch_error';
import { getUserAgentHeader } from '../utils/get_user_agent_header';
import { ensureAbsoluteAvatarUrl } from '../utils/ensure_absolute_avatar_url';
import { getHttpAgentOptions } from '../utils/get_http_agent_options';
import { GitLabProject, GqlProject } from './gitlab_project';
import { getRestIdFromGraphQLId } from '../utils/get_rest_id_from_graphql_id';
import { UserFriendlyError } from '../errors/user_friendly_error';

interface Node<T> {
  pageInfo?: {
    hasNextPage: boolean;
    endCursor: string;
  };
  nodes: T[];
}

interface GqlProjectResult<T> {
  project?: T;
}

interface GqlProjectsResult<T> {
  projects?: {
    nodes?: T[];
  };
}

interface GqlSnippetProject {
  id: string;
  snippets: Node<GqlSnippet>;
}

export interface GqlSnippet {
  id: string;
  projectId: string;
  title: string;
  description: string;
  blobs: Node<GqlBlob>;
}

export interface GqlBlob {
  name: string;
  path: string;
}

interface GqlUser {
  avatarUrl: string | null;
  name: string;
  username: string;
  webUrl: string;
}

interface GqlBasePosition {
  diffRefs: {
    baseSha: string;
    headSha: string;
  };
  filePath: string;
  newPath: string;
  oldPath: string;
}

interface GqlImagePosition extends GqlBasePosition {
  positionType: 'image';
  newLine: null;
  oldLine: null;
}

interface GqlNewPosition extends GqlBasePosition {
  positionType: 'text';
  newLine: number;
  oldLine: null;
}
interface GqlOldPosition extends GqlBasePosition {
  positionType: 'text';
  newLine: null;
  oldLine: number;
}

export type GqlTextPosition = GqlOldPosition | GqlNewPosition;

interface GqlNotePermissions {
  resolveNote: boolean;
  adminNote: boolean;
  createNote: boolean;
}

interface GqlGenericNote<T extends GqlBasePosition | null> {
  id: string;
  author: GqlUser;
  createdAt: string;
  system: boolean;
  body: string; // TODO: remove this once the SystemNote.vue doesn't require plain text body
  bodyHtml: string;
  userPermissions: GqlNotePermissions;
  position: T;
}

interface GqlGenericDiscussion<T extends GqlBasePosition | null> {
  replyId: string;
  createdAt: string;
  resolved: boolean;
  resolvable: boolean;
  notes: Node<GqlGenericNote<T>>;
}

export type GqlTextDiffNote = GqlGenericNote<GqlTextPosition>;
export type GqlTextDiffDiscussion = GqlGenericDiscussion<GqlTextPosition>;

export type GqlDiscussion =
  | GqlGenericDiscussion<GqlTextPosition>
  | GqlGenericDiscussion<GqlImagePosition>
  | GqlGenericDiscussion<null>;

interface GqlDiscussionsProject {
  mergeRequest?: {
    discussions: Node<GqlDiscussion>;
  };
  issue?: {
    discussions: Node<GqlDiscussion>;
  };
}

interface RestLabelEvent {
  label: unknown;
  body: string;
  // eslint-disable-next-line camelcase
  created_at: string;
}

type Note = GqlDiscussion | RestLabelEvent;

interface GetDiscussionsOptions {
  issuable: RestIssuable;
  endCursor?: string;
}

interface RestNote {
  body: string;
}

function isLabelEvent(note: Note): note is RestLabelEvent {
  return (note as RestLabelEvent).label !== undefined;
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

const fragmentProjectDetails = gql`
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

const queryGetProject = gql`
  ${fragmentProjectDetails}
  query GetProject($projectPath: ID!) {
    project(fullPath: $projectPath) {
      ...projectDetails
    }
  }
`;

const queryGetProjects = gql`
  ${fragmentProjectDetails}
  query GetProjects(
    $search: String
    $membership: Boolean
    $limit: Int
    $searchNamespaces: Boolean
  ) {
    projects(
      search: $search
      membership: $membership
      first: $limit
      searchNamespaces: $searchNamespaces
    ) {
      nodes {
        ...projectDetails
      }
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

const discussionsFragment = gql`
  ${positionFragment}
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
      }
    }
  }
`;

const constructGetDiscussionsQuery = (isMr: boolean) => gql`
  ${discussionsFragment}
  query Get${
    isMr ? 'Mr' : 'Issue'
  }Discussions($projectPath: ID!, $iid: String!, $afterCursor: String) {
    project(fullPath: $projectPath) {
      id
      ${isMr ? 'mergeRequest' : 'issue'}(iid: $iid) {
        discussions(after: $afterCursor) {
          ...discussions
        }
      }
    }
  }
`;

const discussionSetResolved = gql`
  mutation DiscussionToggleResolve($replyId: DiscussionID!, $resolved: Boolean!) {
    discussionToggleResolve(input: { id: $replyId, resolve: $resolved }) {
      errors
    }
  }
`;

const createNoteMutation = gql`
  mutation CreateNote($issuableId: NoteableID!, $body: String!, $replyId: DiscussionID) {
    createNote(input: { noteableId: $issuableId, body: $body, discussionId: $replyId }) {
      errors
    }
  }
`;

const deleteNoteMutation = gql`
  mutation DeleteNote($noteId: NoteID!) {
    destroyNote(input: { id: $noteId }) {
      errors
    }
  }
`;

const updateNoteBodyMutation = gql`
  mutation UpdateNoteBody($noteId: NoteID!, $body: String) {
    updateNote(input: { id: $noteId, body: $body }) {
      errors
    }
  }
`;

const getProjectPath = (issuable: RestIssuable) => issuable.references.full.split(/[#!]/)[0];
const isMr = (issuable: RestIssuable) => Boolean(issuable.sha);
const getIssuableGqlId = (issuable: RestIssuable) =>
  `gid://gitlab/${isMr(issuable) ? 'MergeRequest' : 'Issue'}/${issuable.id}`;

export class GitLabNewService {
  client: GraphQLClient;

  constructor(readonly instanceUrl: string, readonly pipelineInstanceUrl?: string) {
    const endpoint = new URL('/api/graphql', this.instanceUrl).href;
    this.client = new GraphQLClient(endpoint, this.fetchOptions);
  }

  private get httpAgent() {
    const agentOptions = getHttpAgentOptions();
    if (agentOptions.proxy) {
      return createHttpProxyAgent(agentOptions.proxy);
    }
    if (this.instanceUrl.startsWith('https://')) {
      return new https.Agent(agentOptions);
    }
    return undefined;
  }

  private get fetchOptions() {
    const token = tokenService.getToken(this.instanceUrl);
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        ...getUserAgentHeader(),
      },
      agent: this.httpAgent,
    };
  }

  async getProject(projectPath: string): Promise<GitLabProject | undefined> {
    const result = await this.client.request<GqlProjectResult<GqlProject>>(queryGetProject, {
      projectPath,
    });
    return result.project && new GitLabProject(result.project);
  }

  async getProjects({
    search,
    membership,
    limit,
    searchNamespaces,
  }: {
    search?: string;
    membership: boolean;
    limit?: number;
    searchNamespaces?: boolean;
  }): Promise<GitLabProject[]> {
    const results = await this.client.request<GqlProjectsResult<GqlProject>>(queryGetProjects, {
      search,
      membership,
      limit,
      searchNamespaces,
    });
    return results.projects?.nodes?.map(project => new GitLabProject(project)) || [];
  }

  async getSnippets(projectPath: string): Promise<GqlSnippet[]> {
    const result = await this.client.request<GqlProjectResult<GqlSnippetProject>>(
      queryGetSnippets,
      {
        projectPath,
      },
    );

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
  async getSnippetContent(snippet: GqlSnippet, blob: GqlBlob): Promise<string> {
    const projectId = getRestIdFromGraphQLId(snippet.projectId);
    const snippetId = getRestIdFromGraphQLId(snippet.id);
    const url = `${this.instanceUrl}/api/v4/projects/${projectId}/snippets/${snippetId}/files/master/${blob.path}/raw`;
    const result = await crossFetch(url, this.fetchOptions);
    if (!result.ok) {
      throw new FetchError(`Fetching snippet from ${url} failed`, result);
    }
    return result.text();
  }

  // This method has to use REST API till https://gitlab.com/gitlab-org/gitlab/-/issues/280803 gets done
  async getMrDiff(mr: RestIssuable): Promise<RestMrVersion> {
    const versionsUrl = `${this.instanceUrl}/api/v4/projects/${mr.project_id}/merge_requests/${mr.iid}/versions`;
    const versionsResult = await crossFetch(versionsUrl, this.fetchOptions);
    if (!versionsResult.ok) {
      throw new FetchError(`Fetching versions from ${versionsUrl} failed`, versionsResult);
    }
    const versions = await versionsResult.json();
    const lastVersion = versions[0];
    const lastVersionUrl = `${this.instanceUrl}/api/v4/projects/${mr.project_id}/merge_requests/${mr.iid}/versions/${lastVersion.id}`;
    const diffResult = await crossFetch(lastVersionUrl, this.fetchOptions);
    if (!diffResult.ok) {
      throw new FetchError(`Fetching MR diff from ${lastVersionUrl} failed`, diffResult);
    }
    return diffResult.json();
  }

  async getFileContent(path: string, ref: string, projectId: number): Promise<string> {
    const pathWithoutFirstSlash = path.replace(/^\//, '');
    const encodedPath = encodeURIComponent(pathWithoutFirstSlash);
    const fileUrl = `${this.instanceUrl}/api/v4/projects/${projectId}/repository/files/${encodedPath}/raw?ref=${ref}`;
    const fileResult = await crossFetch(fileUrl, this.fetchOptions);
    if (!fileResult.ok) {
      throw new FetchError(`Fetching file from ${fileUrl} failed`, fileResult);
    }
    return fileResult.text();
  }

  /*
    The GraphQL endpoint sends us the note.htmlBody with links that start with `/`.
    This works well for the the GitLab webapp, but in VS Code we need to add the full host.
  */
  private addHostToUrl(discussion: GqlDiscussion): GqlDiscussion {
    const prependHost: <T extends GqlBasePosition | null>(
      note: GqlGenericNote<T>,
    ) => GqlGenericNote<T> = note => ({
      ...note,
      bodyHtml: note.bodyHtml.replace(/href="\//, `href="${this.instanceUrl}/`),
      author: {
        ...note.author,
        avatarUrl:
          note.author.avatarUrl && ensureAbsoluteAvatarUrl(this.instanceUrl, note.author.avatarUrl),
      },
    });
    return {
      ...discussion,
      notes: {
        ...discussion.notes,
        nodes: discussion.notes.nodes.map(prependHost),
      },
    } as GqlDiscussion;
  }

  async getDiscussions({ issuable, endCursor }: GetDiscussionsOptions): Promise<GqlDiscussion[]> {
    const projectPath = getProjectPath(issuable);
    const query = constructGetDiscussionsQuery(isMr(issuable));
    const result = await this.client.request<GqlProjectResult<GqlDiscussionsProject>>(query, {
      projectPath,
      iid: String(issuable.iid),
      endCursor,
    });
    assert(result.project, `Project ${projectPath} was not found.`);
    const discussions =
      result.project.issue?.discussions || result.project.mergeRequest?.discussions;
    assert(discussions, `Discussions for issuable ${issuable.references.full} were not found.`);
    if (discussions.pageInfo?.hasNextPage) {
      assert(discussions.pageInfo.endCursor);
      const remainingPages = await this.getDiscussions({
        issuable,
        endCursor: discussions.pageInfo.endCursor,
      });
      return [...discussions.nodes, ...remainingPages];
    }
    return discussions.nodes.map(n => this.addHostToUrl(n));
  }

  async setResolved(replyId: string, resolved: boolean): Promise<void> {
    try {
      return await this.client.request<void>(discussionSetResolved, {
        replyId,
        resolved,
      });
    } catch (e) {
      throw new UserFriendlyError(
        `Couldn't ${resolved ? 'resolve' : 'unresolve'} the discussion when calling the API.
        For more information, review the extension logs.`,
        e,
      );
    }
  }

  private async getLabelEvents(issuable: RestIssuable): Promise<RestLabelEvent[]> {
    const type = isMr(issuable) ? 'merge_requests' : 'issues';
    const labelEventsUrl = `${this.instanceUrl}/api/v4/projects/${issuable.project_id}/${type}/${issuable.iid}/resource_label_events?sort=asc&per_page=100`;
    const result = await crossFetch(labelEventsUrl, this.fetchOptions);
    if (!result.ok) {
      throw new FetchError(`Fetching file from ${labelEventsUrl} failed`, result);
    }
    return result.json();
  }

  async getDiscussionsAndLabelEvents(issuable: RestIssuable): Promise<Note[]> {
    const [discussions, labelEvents] = await Promise.all([
      this.getDiscussions({ issuable }),
      this.getLabelEvents(issuable),
    ]);

    const combinedEvents: Note[] = [...discussions, ...labelEvents];
    combinedEvents.sort((a: Note, b: Note) => {
      const aCreatedAt = isLabelEvent(a) ? a.created_at : a.createdAt;
      const bCreatedAt = isLabelEvent(b) ? b.created_at : b.createdAt;
      return aCreatedAt < bCreatedAt ? -1 : 1;
    });

    return combinedEvents;
  }

  async createNote(issuable: RestIssuable, body: string, replyId?: string): Promise<void> {
    await this.client.request<void>(createNoteMutation, {
      issuableId: getIssuableGqlId(issuable),
      body,
      replyId,
    });
  }

  async deleteNote(noteId: string): Promise<void> {
    try {
      await this.client.request<void>(deleteNoteMutation, {
        noteId,
      });
    } catch (e) {
      throw new UserFriendlyError(
        `Couldn't delete the comment when calling the API.
        For more information, review the extension logs.`,
        e,
      );
    }
  }

  /**
   * This method is used only as a replacement of optimistic locking when updating a note.
   * We request the latest note to validate that it hasn't changed since we last saw it.
   */
  private async getMrNote(mr: RestIssuable, noteId: number): Promise<RestNote> {
    const noteUrl = `${this.instanceUrl}/api/v4/projects/${mr.project_id}/merge_requests/${mr.iid}/notes/${noteId}`;
    const result = await crossFetch(noteUrl, this.fetchOptions);
    if (!result.ok) {
      throw new FetchError(`Fetching the latest note from ${noteUrl} failed`, result);
    }
    return result.json();
  }

  async updateNoteBody(
    noteGqlId: string,
    body: string,
    originalBody: string,
    mr: RestIssuable,
  ): Promise<void> {
    const latestNote = await this.getMrNote(mr, getRestIdFromGraphQLId(noteGqlId));
    // This check is the best workaround we can do in the lack of optimistic locking
    // Issue to make this check in the GitLab instance: https://gitlab.com/gitlab-org/gitlab/-/issues/323808
    if (latestNote.body !== originalBody) {
      throw new UserFriendlyError(
        `This comment changed after you last viewed it, and can't be edited.
        Your new comment is NOT lost. To retrieve it, edit the comment again and copy your comment text,
        then update the original comment by opening the sidebar and running the
        "GitLab: Refresh sidebar" command.`,
        new Error(
          `You last saw:\n"${originalBody}"\nbut the latest version is:\n"${latestNote.body}"`,
        ),
      );
    }
    try {
      await this.client.request<void>(updateNoteBodyMutation, {
        noteId: noteGqlId,
        body,
      });
    } catch (e) {
      throw new UserFriendlyError(
        `Couldn't update the comment when calling the API.
        Your draft hasn't been lost. To see it, edit the comment.
        For more information, review the extension logs.`,
        e,
      );
    }
  }
}
