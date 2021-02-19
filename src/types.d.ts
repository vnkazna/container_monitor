/* eslint-disable camelcase */

/**
 * An issuable instance repesents one of these entities:
 *  - Merge Request
 *  - Issue
 *  - Epic
 *  - Snippet
 */
interface RestIssuable {
  id: number;
  iid: number;
  title: string;
  project_id: number;
  web_url: string;
  author: { name: string; avatar_url: string | null };
  sha?: string; // only present in MR, legacy logic uses the presence to decide issuable type
  references: {
    full: string; // e.g. "gitlab-org/gitlab#219925"
  };
}

interface RestMrVersion {
  head_commit_sha: string;
  base_commit_sha: string;
  diffs: RestDiffFile[];
}

interface RestDiffFile {
  new_path: string;
  old_path: string;
  deleted_file: boolean;
  new_file: boolean;
  renamed_file: boolean;
}

interface VsProject {
  label: string;
  uri: string;
  error?: boolean;
}

interface RestVulnerability {
  location?: {
    file: string;
  };
  web_url: string;
  severity: string;
  name: string;
}

interface RestPipeline {
  status: 'running' | 'pending' | 'success' | 'failed' | 'canceled' | 'skipped';
  updated_at: string;
  id: number;
  web_url: string;
}
