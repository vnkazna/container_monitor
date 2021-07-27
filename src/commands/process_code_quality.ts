import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import * as assert from 'assert';
import { getExtensionConfiguration } from '../utils/get_extension_configuration';
import { gitExtensionWrapper } from '../git/git_extension_wrapper';
import { toReviewUri } from '../review/review_uri';

let collection: vscode.DiagnosticCollection;

interface QualityReport {
  description: string;
  severity: 'minor' | 'major';
  engine_name: string; // eslint-disable-line camelcase
  check_name: string; // eslint-disable-line camelcase
  categories: string[];
  location: {
    path: string;
    lines: {
      begin: number;
      end: number;
    };
  };
}

export const processCodeQuality = async () => {
  const { codeQualityReportPath } = getExtensionConfiguration();
  if (!codeQualityReportPath) return;
  const report: QualityReport[] = JSON.parse((await fs.readFile(codeQualityReportPath)).toString());
  collection?.dispose();
  collection = vscode.languages.createDiagnosticCollection('GitLab Code Quality');
  const repository = gitExtensionWrapper.getActiveRepository();
  assert(repository);
  const errorsByFiles = _.groupBy(report, r => r.location.path);
  const project = await repository.getProject();
  assert(project);
  const entries = _.entries(errorsByFiles).map(([filePath, reports]) => {
    const uri = vscode.Uri.parse(path.join(repository.rootFsPath, filePath));
    // const uri = toReviewUri({
    //   path: filePath,
    //   repositoryRoot: repository.rootFsPath,
    //   projectId: project.restId,
    //   mrId: 94710483,
    //   commit: '7b82120396bd588b0108178d06cb75e5d3719dd4',
    // });
    const diagnostics = reports.map(r => {
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(
          new vscode.Position(r.location.lines.begin - 1, 0),
          new vscode.Position(r.location.lines.end - 1, 1000),
        ),
        r.description,
        r.severity === 'major'
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning,
      );
      diagnostic.source = `GitLab Code Quality`;
      // diagnostic.tags = r.categories.map(c => new vscode.DiagnosticTag)
      return diagnostic;
    });
    return [uri, diagnostics] as const;
  });
  entries.forEach(([uri, diagnostics]) => collection.set(uri, diagnostics));
};
