import { join } from 'node:path'

import * as vscode from 'vscode'

// error is not generated when running traces on just UI
// eslint-disable-next-line ts/prefer-ts-expect-error
// @ts-ignore raw loader
// eslint-disable-next-line antfu/no-import-dist
import html from '../ui/dist/200.html?raw'
import type { Message } from '../shared/src/typebox'
import { noop, watchT } from './appState'
import { handleMessage } from './handleMessages'
import { logMessage } from './storage'

function devEmitter(_message: any) {}

let panel: undefined | ReturnType<typeof vscode.window.createWebviewPanel>
let disposed = true

let holdContext: vscode.ExtensionContext | undefined
export function initWebviewPanel(extensionContext: vscode.ExtensionContext) {
  watchT('projectName', (name) => {
    if (panel)
      panel.title = `Trace Viewer - ${name}`
  }, noop)
  holdContext = extensionContext
}

export function isTraceViewAlive() {
  return panel && !disposed
}

export function getTracePanel(context: vscode.ExtensionContext = holdContext!) {
  if (!panel)
    prepareWebView(context, false)

  return panel!
}

export function prepareWebView(context: vscode.ExtensionContext | undefined = holdContext, show = false) {
  if (!context)
    throw new Error('context was not passed or set')

  let ret: vscode.Disposable | undefined
  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      'vueWebView',
      'Trace Viewer',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true },
    )
    context.subscriptions.push(panel)

    disposed = false
    panel.onDidDispose(() => {
      panel = undefined
      disposed = true
    })

    const processedHTML = (html as string).replace(
      /(src|href)="([^"]+)"/g,
      (string, _attribute, source) => string.replace(source, panel!.webview.asWebviewUri(
        vscode.Uri.file(
          join(context.extensionPath, 'ui/dist', source),
        ),
      ).toString())
      ,
    )

    panel.webview.html = processedHTML
    panel.webview.onDidReceiveMessage((message) => {
      handleMessage(message)
    })

    ret = panel
  }

  if (show)
    panel.reveal()

  return ret
}

export function postMessage(message: Message) {
  logMessage(message)
  devEmitter(message)
  if (isTraceViewAlive())
    getTracePanel().webview.postMessage(message)
}
