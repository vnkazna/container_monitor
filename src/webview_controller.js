const fs = require('fs');
const path = require('path');
const vscode = require('vscode');
const gitLabService = require('./gitlab_service');

let context = null;

const addDeps = ctx => {
  context = ctx;
};

const getNonce = () => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
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
  const isDev = !fs.existsSync(path.join(context.extensionPath, 'src/webview/dist/js/app.js'));

  return isDev ? 'src/webview/public/dev.html' : 'src/webview/public/index.html';
};

const replaceResources = panel => {
  const { appScriptUri, vendorUri, styleUri, devScriptUri } = getResources(panel);

  return fs
    .readFileSync(path.join(context.extensionPath, getIndexPath()), 'UTF-8')
    .replace(/{{nonce}}/gm, getNonce())
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
  });
};

function sendIssuableAndDiscussions(panel, issuable, discussions, appIsReady) {
  if (!discussions || !appIsReady) return;
  panel.webview.postMessage({ type: 'issuableFetch', issuable, discussions });
}

async function handleCreate(panel, issuable, workspaceFolder) {
  let discussions = false;
  let labelEvents = false;
  let appIsReady = false;
  panel.webview.onDidReceiveMessage(async message => {
    if (message.command === 'appReady') {
      appIsReady = true;
      sendIssuableAndDiscussions(panel, issuable, discussions, appIsReady);
    }

    if (message.command === 'renderMarkdown') {
      message.markdown = message.markdown.replace(
        /\(\/.*(\/-)?\/merge_requests\//,
        '(/-/merge_requests/',
      );
      let rendered = await gitLabService.renderMarkdown(message.markdown, workspaceFolder);
      rendered = (rendered || '')
        .replace(/ src=".*" alt/gim, ' alt')
        .replace(/" data-src/gim, '" src')
        .replace(
          / href="\//gim,
          ` href="${vscode.workspace.getConfiguration('gitlab').instanceUrl}/`,
        )
        .replace(/\/master\/-\/merge_requests\//gim, '/-/merge_requests/');

      panel.webview.postMessage({
        type: 'markdownRendered',
        ref: message.ref,
        object: message.object,
        markdown: rendered,
      });
    }

    if (message.command === 'saveNote') {
      const response = await gitLabService.saveNote({
        issuable: message.issuable,
        note: message.note,
        noteType: message.noteType,
      });

      if (response.status !== false) {
        const newDiscussions = await gitLabService.fetchDiscussions(issuable);
        panel.webview.postMessage({ type: 'issuableFetch', issuable, discussions: newDiscussions });
        panel.webview.postMessage({ type: 'noteSaved' });
      } else {
        panel.webview.postMessage({ type: 'noteSaved', status: false });
      }
    }
  });

  // TODO: Call APIs in parallel
  discussions = await gitLabService.fetchDiscussions(issuable);
  labelEvents = await gitLabService.fetchLabelEvents(issuable);
  discussions = discussions.concat(labelEvents);
  discussions.sort((a, b) => {
    const aCreatedAt = a.label ? a.created_at : a.notes[0].created_at;
    const bCreatedAt = b.label ? b.created_at : b.notes[0].created_at;
    return aCreatedAt < bCreatedAt ? -1 : 1;
  });
  sendIssuableAndDiscussions(panel, issuable, discussions, appIsReady);
}

async function create(issuable, workspaceFolder) {
  const panel = createPanel(issuable);
  const html = replaceResources(panel);
  panel.webview.html = html;

  let lightIconUri = vscode.Uri.file(
    path.join(context.extensionPath, 'src', 'assets', 'images', 'light', 'issues.svg'),
  );
  let darkIconUri = vscode.Uri.file(
    path.join(context.extensionPath, 'src', 'assets', 'images', 'dark', 'issues.svg'),
  );
  if (issuable.squash_commit_sha !== undefined) {
    lightIconUri = vscode.Uri.file(
      path.join(context.extensionPath, 'src', 'assets', 'images', 'light', 'merge_requests.svg'),
    );
    darkIconUri = vscode.Uri.file(
      path.join(context.extensionPath, 'src', 'assets', 'images', 'dark', 'merge_requests.svg'),
    );
  }
  panel.iconPath = { light: lightIconUri, dark: darkIconUri };

  panel.onDidChangeViewState(() => {
    handleCreate(panel, issuable, workspaceFolder);
  });

  handleCreate(panel, issuable, workspaceFolder);
}

exports.addDeps = addDeps;
exports.create = create;
