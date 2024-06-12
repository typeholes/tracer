import { isAbsolute, join } from 'node:path'
import * as vscode from 'vscode'
import { Value } from '@sinclair/typebox/value'
import * as Messages from '../shared/src/typebox'
import { filterTree, getChildrenById, getTypesById, getTypesByTypeId } from './client/actions'
import { log } from './logger'
import { deleteTraceFiles, setLastMessageTrigger } from './storage'
import { state, triggerAll } from './appState'

export function handleMessage(message: unknown): void {
  if (message === 'init client') {
    triggerAll(false, true)
    filterTree('check', '', 0, true)
    return
  }

  setLastMessageTrigger(message)
  if (!Value.Check(Messages.message, message)) {
    vscode.window.showWarningMessage(`Unknown message ${JSON.stringify(message).slice(0, 20)}`)
    return
  }

  const data = message
  switch (data.message) {
    case 'gotoLocation': break
    case 'gotoPosition':
      gotoPosition(data.fileName, data.pos)
      break
    case 'log':
      log(...data.value)
      break
    case 'filterTree': {
      filterTree(data.startsWith, data.sourceFileName, data.position || 0, true)
      break
    }
    case 'saveOpen': {
      state.saveName.value = data.name
      break
    }
    case 'childrenById': {
      getChildrenById(data.id)
      break
    }
    case 'typesById': {
      getTypesById(data.id)
      break
    }
    case 'typesByTypeId': {
      getTypesByTypeId(data.id)
      break
    }

    case 'deletTraceFile': {
      deleteTraceFiles(data.fileName, data.dirName)
    }
  }
}

async function gotoPosition(fileName: string, pos: number) {
  const workspacePath = state.workspacePath.value
  const absoluteFileName = isAbsolute(fileName) ? fileName : join(workspacePath, fileName)
  const uri = vscode.Uri.file(absoluteFileName)
  const document = vscode.workspace.textDocuments.find(x => x.fileName === fileName) ?? await vscode.workspace.openTextDocument(uri)
  const position = document.positionAt(pos + 1)
  const location = new vscode.Location(uri, position)

  const editor = vscode.window.visibleTextEditors.find(editor => editor.document.fileName === fileName)
  if (editor) {
    vscode.window.showTextDocument(editor.document, editor?.viewColumn, false)
    editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.Default)
  }

  vscode.commands.executeCommand(
    'editor.action.goToLocations',
    uri,
    position,
    [location],
    'goto',
    'location not found',
  )
}
