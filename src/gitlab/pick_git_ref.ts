import * as vscode from 'vscode';
import { Credentials } from '../services/token_service';
import { pickWithQuery } from '../utils/pick_with_query';
import { GitLabService } from './gitlab_service';

type BranchRef = RestBranch & vscode.QuickPickItem & { refType: 'branch' };
type TagRef = RestTag & vscode.QuickPickItem & { refType: 'tag' };

export async function pickGitRef(
  credentials: Credentials,
  project: string | number,
): Promise<BranchRef | TagRef | undefined> {
  const service = new GitLabService(credentials);
  const { picked } = await pickWithQuery(
    {
      ignoreFocusOut: true,
      placeholder: 'Select branch or tag',
    },
    async query => {
      const [branches, tags] = await Promise.all([
        service.getBranches(project, query),
        service.getTags(project, query),
      ]);

      return [
        ...branches.map(
          b => ({ ...b, refType: 'branch', label: `$(git-branch) ${b.name}` } as BranchRef),
        ),
        ...tags.map(t => ({ ...t, refType: 'tag', label: `$(tag) ${t.name}` } as TagRef)),
      ];
    },
  );
  return picked;
}
