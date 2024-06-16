/* eslint-disable node/prefer-global/process */
import type { WebSocket } from 'ws'
import { WebSocketServer } from 'ws'

import type * as Messages from '../../shared/src/typebox'
import { receiveMessage } from './receiveMessage.tb'

let firstWsConnection: WebSocket | undefined
export function init(port: number) {
  const wss = new WebSocketServer({ port })

  log('listening on 3010')

  wss.on('connection', (ws) => {
    firstWsConnection ??= ws
    log('connected')
    ws.on('error', console.error)

    ws.on('message', (data) => {
      const str = data.toString()
      try {
        const payload = JSON.parse(str)
        processMessagePayload(ws, payload)
      }
      catch (_e) {
        log(`non message payload ${str}`)
      }
    })
  })
}

export function log(message: any) {
  process.send?.({ log: message })
}

process.on('message', (payload) => {
  if (payload === 'exit')
    process.exit()

  else if (payload === 'ping')
    log('ping message received')

  else if (firstWsConnection)
    processMessagePayload(firstWsConnection, payload)
})

function processMessagePayload(ws: WebSocket, payload: unknown) {
  if (Array.isArray(payload)) {
    const [id, parsed] = payload
    if (typeof id !== 'number') {
      log('invalid message')
      log(JSON.stringify(payload, null, 2))
      return
    }
    if (payload.length !== 2) {
      log('invalid message')
      log(JSON.stringify(payload, null, 2))
      sendError(ws, id, 'expected a single object payload')
      return
    }

    if (Array.isArray(parsed)) {
      sendError(ws, id, 'expected a single object payload')
      log('unhandled payload')
      for (const item of parsed) log(`\t ${item}`)
    }
    else if (typeof parsed === 'object') {
      receiveMessage(id, parsed, ws)
    }
  }
  else {
    log(`string payload ${JSON.stringify(payload, null, 2)}`)
  }
}

// let messageHandler = (message: any) => log(message);
// export function setMessageHandler(handler: (message: any) => void) {
//    messageHandler = handler;
// }

// export function emitMessage(message: any) {
//    globalSocket?.emit(message.message, message);
// }

/*
io.on('connection', (socket) => {
   globalSocket = socket; // dumb but good enough.  latest connection get's the vscode emits
   log('a user connected');
   messageHandler('init client');
   socket.on('message', (...args: any[]) => {
      receiveMessage(args, socket);
   });
   socket.on('ping', () => {
      log('pinged');
      socket.emit('pong');
   });
});

server.listen(3010, 'localhost', () => {
   log('server running at http://localhost:3010');
});

*/

export function sendResponse(
  ws: WebSocket,
  id: number,
  response: Messages.Message,
  complete = true,
) {
  ws.send(
    JSON.stringify([id, response, complete ? 'complete' : 'incomplete']),
  )
}

export function sendError(ws: WebSocket, id: number, errorMessage: string) {
  ws.send(JSON.stringify([id, 'error', errorMessage]))
}
