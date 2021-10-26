export const makeMarkdownLinksAbsolute = (
  markdown: string,
  projectPath: string,
  instanceUrl: string,
): string => markdown.replace(/\]\(\/uploads\//gm, `](${instanceUrl}/${projectPath}/uploads/`);
