import type WebSocket from 'ws'
import { Value } from '@sinclair/typebox/value'
import type * as Messages from '../../shared/src/typebox'
import * as TB from '../../shared/src/typebox'
import type { Tree } from './tsTrace'
import { runLiveTrace, tree as treeRoot } from './tsTrace'
// import * as Messages from './messages'
import { sendError, sendResponse } from './server'
import { getChildrenById, getStatsFromTree, getTypesById, getTypesByTypeId } from './traceMetrics'

export function receiveMessage(id: number, args: unknown, ws: WebSocket) {
  try {
    if (Value.Check(TB.message, args)) {
      const parsed = { data: args }

      switch (parsed.data.message) {
        case 'traceStart': {
          runLiveTrace(parsed.data.projectPath, parsed.data.traceDir)
          const response: Messages.Message = { message: 'traceStop' }
          sendResponse(ws, id, response)
          break
        }

        case 'childrenById': {
          const response: Messages.SpecificMessage<'childrenById'> = { ...parsed.data, children: getChildrenById(parsed.data.id) }
          sendResponse(ws, id, response)
          break
        }

        case 'typesById': {
          const response: Messages.SpecificMessage<'typesById'> = { ...parsed.data, types: getTypesById(parsed.data.id) }
          sendResponse(ws, id, response)
          break
        }

        case 'typesByTypeId': {
          const response: Messages.SpecificMessage<'typesByTypeId'> = { ...parsed.data, types: getTypesByTypeId(parsed.data.id) }
          sendResponse(ws, id, response as any) // TODO: investigate type mismatch here
          break
        }

        case 'filterTree': {
          const { startsWith, sourceFileName, position } = parsed.data
          const roots = filterTree(startsWith, sourceFileName, position)
          showTree(ws, id, roots)
          break
        }

        case 'fileStats': {
          const stats = getStatsFromTree(parsed.data.fileName)
          sendResponse(ws, id, { ...parsed.data, stats })
          break
        }
      }
    }
  }
  catch (e) {
    sendError(ws, id, `${e}`)
  }
}

export function filterTree(
  startsWith: string,
  sourceFileName: string,
  position: number | '',
  tree = treeRoot,
): Tree[] {
  if (position === '')
    position = 0

  if (!tree)
    return []

  if (
    'name' in tree.line
    && tree.line.name.startsWith(startsWith)
    && (!sourceFileName
    || (tree.line.args?.path ?? '').endsWith(sourceFileName))
    && (!(position > 0) || (tree.line.args?.pos ?? 0) === position)
  ) {
    return [tree]
  }

  return tree.children
    .map(child => filterTree(startsWith, sourceFileName, position, child))
    .flat()
}

export const treeIdNodes = new Map<number, Tree>()
let showTreeInterval: undefined | ReturnType<typeof setInterval>
export function showTree(ws: WebSocket, requestId: number, nodes: Tree[]) {
  if (showTreeInterval) {
    clearInterval(showTreeInterval)
    showTreeInterval = undefined
  }

  // TODO: parent should be a node id
  const skinnyNodes = nodes.map(x => ({
    ...x,
    parent: undefined,
    children: [],
    types: [],
  }))

  sendResponse(
    ws,
    requestId,
    {
      message: 'showTree',
      nodes: [],
      step: 'start',
    },
    false,
  )

  let i = 0

  // this can be large enough to freeze the UI if sent at once
  showTreeInterval = setInterval(() => {
    if (!showTreeInterval)
      return

    sendResponse(
      ws,
      requestId,
      {
        message: 'showTree',
        nodes: skinnyNodes.slice(i, i + 10),
        step: 'add',
      },
      false,
    )

    i += 10
    if (i >= skinnyNodes.length) {
      clearInterval(showTreeInterval)
      showTreeInterval = undefined
      sendResponse(
        ws,
        requestId,
        {
          message: 'showTree',
          nodes: [],
          step: 'done',
        },
        true,
      )
    }
  }, 30)

  nodes.forEach(node => treeIdNodes.set(node.id, node))
  return nodes
}