import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as assert from 'assert';
import * as gitLabService from './gitlab_service';
import { createGitLabNewService } from './service_factory';
import { logError } from './log';
import { getInstanceUrl } from './utils/get_instance_url';
import { isMr } from './utils/is_mr';

const webviewResourcePaths = {
  appScriptUri: 'src/webview/dist/js/app.js',
  vendorUri: 'src/webview/dist/js/chunk-vendors.js',
  styleUri: 'src/webview/dist/css/app.css',
  devScriptUri: 'src/webview/dist/app.js',
} as const;

type WebviewResources = Record<keyof typeof webviewResourcePaths, vscode.Uri>;

async function initPanelIfActive(
  panel: vscode.WebviewPanel,
  issuable: RestIssuable,
  repositoryRoot: string,
) {
  if (!panel.active) return;

  const appReadyPromise = new Promise<void>(resolve => {
    const sub = panel.webview.onDidReceiveMessage(async message => {
      if (message.command === 'appReady') {
        sub.dispose();
        resolve();
      }
    });
  });

  const gitlabNewService = await createGitLabNewService(repositoryRoot);
  const discussionsAndLabels = await gitlabNewService.getDiscussionsAndLabelEvents(issuable);
  await appReadyPromise;
  await panel.webview.postMessage({
    type: 'issuableFetch',
    issuable,
    discussions: discussionsAndLabels,
  });
}

class WebviewController {
  context?: vscode.ExtensionContext;

  isDev = false;

  openedPanels: Record<string, vscode.WebviewPanel | undefined> = {};

  init(context: vscode.ExtensionContext, isDev: boolean) {
    this.context = context;
    this.isDev = isDev;
  }

  private getResources(panel: vscode.WebviewPanel): WebviewResources {
    return Object.entries(webviewResourcePaths).reduce((acc, [key, value]) => {
      assert(this.context);
      const uri = vscode.Uri.file(path.join(this.context.extensionPath, value));
      return { ...acc, [key]: panel.webview.asWebviewUri(uri) };
    }, {}) as WebviewResources;
  }

  private getIndexPath() {
    return this.isDev ? 'src/webview/public/dev.html' : 'src/webview/public/index.html';
  }

  private replaceResources(panel: vscode.WebviewPanel) {
    assert(this.context);
    const { appScriptUri, vendorUri, styleUri, devScriptUri } = this.getResources(panel);
    const nonce = crypto.randomBytes(20).toString('hex');

    return fs
      .readFileSync(path.join(this.context.extensionPath, this.getIndexPath()), 'UTF-8')
      .replace(/{{nonce}}/gm, nonce)
      .replace('{{styleUri}}', styleUri.toString())
      .replace('{{vendorUri}}', vendorUri.toString())
      .replace('{{appScriptUri}}', appScriptUri.toString())
      .replace('{{devScriptUri}}', devScriptUri.toString());
  }

  private createPanel(issuable: RestIssuable) {
    assert(this.context);
    const title = `${issuable.title.slice(0, 20)}...`;

    return vscode.window.createWebviewPanel('glWorkflow', title, vscode.ViewColumn.One, {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'src'))],
      retainContextWhenHidden: true,
    });
  }

  private createMessageHandler = (
    panel: vscode.WebviewPanel,
    issuable: RestIssuable,
    repositoryRoot: string,
  ) => async (message: any) => {
    const instanceUrl = await getInstanceUrl(repositoryRoot);
    if (message.command === 'renderMarkdown') {
      let rendered = await gitLabService.renderMarkdown(message.markdown, repositoryRoot);
      rendered = (rendered || '')
        .replace(/ src=".*" alt/gim, ' alt')
        .replace(/" data-src/gim, '" src')
        .replace(/ href="\//gim, ` href="${instanceUrl}/`);

      await panel.webview.postMessage({
        type: 'markdownRendered',
        ref: message.ref,
        object: message.object,
        markdown: rendered,
      });
    }

    if (message.command === 'saveNote') {
      const gitlabNewService = await createGitLabNewService(repositoryRoot);
      try {
        await gitlabNewService.createNote(issuable, message.note, message.replyId);
        const discussionsAndLabels = await gitlabNewService.getDiscussionsAndLabelEvents(issuable);
        await panel.webview.postMessage({
          type: 'issuableFetch',
          issuable,
          discussions: discussionsAndLabels,
        });
        await panel.webview.postMessage({ type: 'noteSaved' });
      } catch (e) {
        logError(e);
        await panel.webview.postMessage({ type: 'noteSaved', status: false });
      }
    }
  };

  private getIconPathForIssuable(issuable: RestIssuable) {
    const getIconUri = (shade: string, file: string) =>
      vscode.Uri.file(
        path.join(this.context!.extensionPath, 'src', 'assets', 'images', shade, file),
      );
    const lightIssueIcon = getIconUri('light', 'issues.svg');
    const lightMrIcon = getIconUri('light', 'merge_requests.svg');
    const darkIssueIcon = getIconUri('dark', 'issues.svg');
    const darkMrIcon = getIconUri('dark', 'merge_requests.svg');
    return isMr(issuable)
      ? { light: lightMrIcon, dark: darkMrIcon }
      : { light: lightIssueIcon, dark: darkIssueIcon };
  }

  async open(issuable: RestIssuable, repositoryRoot: string) {
    const panelKey = `${repositoryRoot}-${issuable.id}`;
    const openedPanel = this.openedPanels[panelKey];
    if (openedPanel) {
      openedPanel.reveal();
      return openedPanel;
    }
    const newPanel = await this.create(issuable, repositoryRoot);
    this.openedPanels[panelKey] = newPanel;
    newPanel.onDidDispose(() => {
      this.openedPanels[panelKey] = undefined;
    });
    return newPanel;
  }

  private async create(issuable: RestIssuable, repositoryRoot: string) {
    assert(this.context);
    const panel = this.createPanel(issuable);
    const html = this.replaceResources(panel);
    panel.webview.html = html;
    panel.iconPath = this.getIconPathForIssuable(issuable);

    await initPanelIfActive(panel, issuable, repositoryRoot);
    panel.onDidChangeViewState(async () => {
      await initPanelIfActive(panel, issuable, repositoryRoot);
    });

    panel.webview.onDidReceiveMessage(this.createMessageHandler(panel, issuable, repositoryRoot));
    return panel;
  }
}

export const webviewController = new WebviewController();