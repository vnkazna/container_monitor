const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vscode = require('vscode');
const gitLabService = require('./gitlab_service');
const { createGitLabNewService } = require('./service_factory');
const { logError } = require('./log');

let context = null;

const addDeps = ctx => {
  context = ctx;
};

const getResources = panel => {
  const paths = {
    appScriptUri: 'src/webview/dist/js/app.js',
    vendorUri: 'src/webview/dist/js/chunk-vendors.js',
    styleUri: 'src/webview/dist/css/app.css',
    devScriptUri: 'src/webview/dist/app.js',
  };

  Object.keys(paths).forEach(key => {
    const uri = vscode.Uri.file(path.join(context.extensionPath, paths[key]));

    paths[key] = panel.webview.asWebviewUri(uri);
  });

  return paths;
};

const getIndexPath = () => {
  const isDev = process.env.NODE_ENV === 'development';

  return isDev ? 'src/webview/public/dev.html' : 'src/webview/public/index.html';
};

const replaceResources = panel => {
  const { appScriptUri, vendorUri, styleUri, devScriptUri } = getResources(panel);
  const nonce = crypto.randomBytes(20).toString('hex');

  return fs
    .readFileSync(path.join(context.extensionPath, getIndexPath()), 'UTF-8')
    .replace(/{{nonce}}/gm, nonce)
    .replace('{{styleUri}}', styleUri)
    .replace('{{vendorUri}}', vendorUri)
    .replace('{{appScriptUri}}', appScriptUri)
    .replace('{{devScriptUri}}', devScriptUri);
};

const createPanel = issuable => {
  const title = `${issuable.title.slice(0, 20)}...`;

  return vscode.window.createWebviewPanel('glWorkflow', title, vscode.ViewColumn.One, {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'src'))],
    retainContextWhenHidden: true,
  });
};

const createMessageHandler = (panel, issuable, workspaceFolder) => async message => {
  if (message.command === 'renderMarkdown') {
    const alteredMarkdown = message.markdown.replace(
      /\(\/.*(\/-)?\/merge_requests\//,
      '(/-/merge_requests/',
    );
    let rendered = await gitLabService.renderMarkdown(alteredMarkdown, workspaceFolder);
    rendered = (rendered || '')
      .replace(/ src=".*" alt/gim, ' alt')
      .replace(/" data-src/gim, '" src')
      .replace(/ href="\//gim, ` href="${vscode.workspace.getConfiguration('gitlab').instanceUrl}/`)
      .replace(/\/master\/-\/merge_requests\//gim, '/-/merge_requests/');

    panel.webview.postMessage({
      type: 'markdownRendered',
      ref: message.ref,
      object: message.object,
      markdown: rendered,
    });
  }

  if (message.command === 'saveNote') {
    const gitlabNewService = await createGitLabNewService(workspaceFolder);
    try {
      await gitlabNewService.createNote(issuable, message.note, message.replyId);
      const discussionsAndLabels = await gitlabNewService.getDiscussionsAndLabelEvents(issuable);
      panel.webview.postMessage({
        type: 'issuableFetch',
        issuable,
        discussions: discussionsAndLabels,
      });
      panel.webview.postMessage({ type: 'noteSaved' });
    } catch (e) {
      logError(e);
      panel.webview.postMessage({ type: 'noteSaved', status: false });
    }
  }
};

async function initPanelIfActive(panel, issuable, workspaceFolder) {
  if (!panel.active) return;

  const appReadyPromise = new Promise(resolve => {
    const sub = panel.webview.onDidReceiveMessage(async message => {
      if (message.command === 'appReady') {
        sub.dispose();
        resolve();
      }
    });
  });

  const gitlabNewService = await createGitLabNewService(workspaceFolder);
  const discussionsAndLabels = await gitlabNewService.getDiscussionsAndLabelEvents(issuable);
  await appReadyPromise;
  panel.webview.postMessage({ type: 'issuableFetch', issuable, discussions: discussionsAndLabels });
}

const getIconPathForIssuable = issuable => {
  const getIconUri = (shade, file) =>
    vscode.Uri.file(path.join(context.extensionPath, 'src', 'assets', 'images', shade, file));
  const lightIssueIcon = getIconUri('light', 'issues.svg');
  const lightMrIcon = getIconUri('light', 'merge_requests.svg');
  const darkIssueIcon = getIconUri('dark', 'issues.svg');
  const darkMrIcon = getIconUri('dark', 'merge_requests.svg');
  const isMr = issuable.squash_commit_sha !== undefined;
  return isMr
    ? { light: lightMrIcon, dark: darkMrIcon }
    : { light: lightIssueIcon, dark: darkIssueIcon };
};

async function create(issuable, workspaceFolder) {
  const panel = createPanel(issuable);
  const html = replaceResources(panel);
  panel.webview.html = html;
  panel.iconPath = getIconPathForIssuable(issuable);

  initPanelIfActive(panel, issuable, workspaceFolder);
  panel.onDidChangeViewState(() => {
    initPanelIfActive(panel, issuable, workspaceFolder);
  });

  panel.webview.onDidReceiveMessage(createMessageHandler(panel, issuable, workspaceFolder));
  return panel;
}

exports.addDeps = addDeps;
exports.create = create;
