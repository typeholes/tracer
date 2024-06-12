import { log } from 'node:console'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { join } from 'node:path'
import WebSocket from 'ws'
import * as vscode from 'vscode'
import { Value } from '@sinclair/typebox/value'
import * as Messages from '../../shared/src/typebox'
import type { MessageType, MessageValues } from '../../shared/src/typebox'
import { handleMessage } from '../handleMessages'
import { getCurrentConfig } from '../configuration'

// TODO: auto reconnect

// eslint-disable-next-line import/no-mutable-exports
export let send = (_payload: unknown) => {}
let serverProcess: ChildProcessWithoutNullStreams

export function stopTracerServer() {
  if (serverProcess)
    serverProcess.kill()
}

export function initClient(context: vscode.ExtensionContext) {
  const serverOutputChannel = vscode.window.createOutputChannel('Trace Server stderr')

  context.subscriptions.push(serverOutputChannel)

  const port = getCurrentConfig().traceServerPort

  const fullCmd = `node ${join(__dirname, 'server', 'index.js')} ${port} --inspect=9299`

  log(`shell: ${process.env.SHELL}`)
  serverProcess = spawn(fullCmd, [], { cwd: __dirname, shell: process.env.SHELL })

  serverProcess.stderr.on('data', (data) => {
    const str = data.toString()
    serverOutputChannel.append(str)
    vscode.window.showErrorMessage(str)
  })
  serverProcess.stdout.on('data', data => serverOutputChannel.append(data.toString()))

  serverProcess.on('error', (error) => {
    vscode.window.showErrorMessage(error.message)
  })

  serverProcess.on('spawn', () => {
    const ws = new WebSocket(`ws://localhost:${port}`)

    send = (payload: unknown) => {
      if (ws.readyState !== ws.OPEN)
        return

      if (typeof payload === 'string') {
        payload = [payload]
      }
      ws.send(JSON.stringify(payload))
    }

    ws.on('error', console.error)

    ws.on('open', () => {
      send('ping')
    })

    ws.on('pong', (data) => {
      log('pong: %s', data)
    })

    ws.on('message', (data: WebSocket.RawData[]) => {
      const str = data.toString()
      try {
        const arr = JSON.parse(str)
        if (Array.isArray(arr)) {
          const id = arr[0]
          if (typeof id !== 'number') {
            log('invalid message')
            log(JSON.stringify(arr, null, 2))
            return
          }

          if (arr.length === 3) {
            if (arr[1] === 'error' && typeof arr[2] === 'string') {
              handleResponseError(id, arr[2])
            }
            else if (!Array.isArray(arr[1]) && typeof arr[1] == 'object' && arr[1] && (arr[2] === 'complete' || arr[2] === 'incomplete')) {
              handleResponse(id, arr[1], arr[2] === 'complete')
            }
            else {
              log(`invalid error payload ${str}`)
            }
            return
          }

          if (arr.length === 1) {
            if (Array.isArray(arr[0]) || typeof arr[0] !== 'object' || !arr[0]) {
              log(`invalid response payload ${str}`)
              return handleMessage(arr[0])
            }

            log(`unhandled payload ${str}`)
          }
        }
        else {
          log(`unhandled payload ${str}`)
        }
      }
      catch (_e) {
        log(`non message payload ${str}`)
      }
    })
  })
}

const responseHandlers: ([MessageType, ((message: Messages.Message, complete: boolean) => void), (error: string) => void] | undefined)[] = []
let responseIdx = 0
export function wsMessage<T extends MessageType>(type: T, value: MessageValues<T>) {
  send([responseIdx, { ...value, message: type }])
  const ret = <H extends MessageType>(type: H, handler: (values: Messages.SpecificMessage<H>, complete: boolean) => void, errorHandler: (error: string) => void) => {
    function runHandler(message: Messages.SpecificMessage<H>, complete: boolean) {
      handler(message, complete)
    }
    responseHandlers[responseIdx] = [type, runHandler as any, errorHandler]
    responseIdx = (responseIdx + 1) % 1000
  }
  return ret
}

function handleResponse(handlerIdx: number, message: object, complete: boolean) {
  const [expectedType, handler] = responseHandlers[handlerIdx] ?? []
  if (!handler) {
    log('response handler was not defined or the response was already handled')
    return
  }

  if (complete)
    responseHandlers[handlerIdx] = undefined

  if (!Value.Check(Messages.message, message)) {
    log('response payload was not a message object')
    return
  }

  const parsed = { data: message }

  if (expectedType !== parsed.data.message) {
    log(`response type ${parsed.data.message} did not match expected type ${expectedType}`)
    return
  }

  handler(message as any, complete)
}

function handleResponseError(handlerIdx: number, message: string) {
  const handler = responseHandlers[handlerIdx]?.[2]
  if (!handler) {
    log('response error handler was not defined or the response was already handled')
    return
  }

  responseHandlers[handlerIdx] = undefined
  handler(message)
}
