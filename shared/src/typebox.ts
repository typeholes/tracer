import type { Static } from '@sinclair/typebox'
import { Type } from '@sinclair/typebox'

export type TypeLine = Static<typeof typeLine>
export const typeLine = Type.Object({
  id: Type.Number(),
  intrinsicName: Type.Optional(Type.Union([Type.String(), Type.Undefined()])),
  recursionRelatedTypeIds: Type.Optional(
    Type.Union([
      Type.Tuple([Type.Number(), Type.Array(Type.Number())]),
      Type.Undefined(),
    ]),
  ),
  flags: Type.Optional(
    Type.Union([Type.Array(Type.String()), Type.Undefined()]),
  ),
  ts: Type.Optional(Type.Union([Type.Number(), Type.Undefined()])),
  dur: Type.Optional(Type.Union([Type.Number(), Type.Undefined()])),
  display: Type.Optional(Type.Union([Type.String(), Type.Undefined()])),
})

export type TraceLine = Static<typeof traceLine>
export const traceLine = Type.Object({
  ts: Type.Number(),
  pid: Type.Number(),
  tid: Type.Number(),
  ph: Type.String(),
  cat: Type.String(),
  name: Type.String(),
  dur: Type.Optional(Type.Union([Type.Number(), Type.Undefined()])),
  results: Type.Optional(Type.Union([Type.Object({}), Type.Undefined()])),
  args: Type.Optional(
    Type.Union([
      Type.Object({
        path: Type.Optional(Type.Union([Type.String(), Type.Undefined()])),
        kind: Type.Optional(Type.Union([Type.Number(), Type.Undefined()])),
        pos: Type.Optional(Type.Union([Type.Number(), Type.Undefined()])),
        end: Type.Optional(Type.Union([Type.Number(), Type.Undefined()])),
        location: Type.Optional(
          Type.Union([
            Type.Object({
              line: Type.Number(),
              character: Type.Number(),
            }),
            Type.Undefined(),
          ]),
        ),
        results: Type.Optional(
          Type.Union([
            Type.Object({
              typeId: Type.Optional(
                Type.Union([Type.Number(), Type.Undefined()]),
              ),
            }),
            Type.Undefined(),
          ]),
        ),
      }),
      Type.Undefined(),
    ]),
  ),
})

export type Tree = Static<typeof tree>
export const tree = Type.Recursive(This =>
  Type.Object({
    id: Type.Number(),
    parentId: Type.Number(),
    line: traceLine,
    children: Type.Array(This),
    typeIds: Type.Array(Type.Number()),
    childCnt: Type.Number(),
    maxDepth: Type.Number(),
    childTypeCnt: Type.Number(),
    typeCnt: Type.Number(),
    typeRecursionId: Type.Optional(Type.Number()),
  }),
)

export type Message = Static<typeof message>
export const message = Type.Union([
  Type.Object({
    message: Type.Literal('typesById'),
    id: Type.Number(),
    types: Type.Optional(Type.Array(typeLine)),
  }),
  Type.Object({
    message: Type.Literal('gotoLocation'),
    line: Type.Number(),
    character: Type.Number(),
    fileName: Type.String(),
  }),
  Type.Object({
    message: Type.Literal('deletTraceFile'),
    fileName: Type.String(),
    dirName: Type.String(),
  }),
  Type.Object({
    message: Type.Literal('traceFileLoaded'),
    fileName: Type.String(),
    dirName: Type.String(),
    resetFileList: Type.Boolean(),
  }),
  Type.Object({
    message: Type.Literal('gotoTracePosition'),
    fileName: Type.String(),
    position: Type.Number(),
  }),
  Type.Object({
    message: Type.Literal('postionTypeCounts'),
    counts: Type.Record(
      Type.String(),
      Type.Record(Type.String(), Type.Number()),
    ),
  }),
  Type.Object({
    message: Type.Literal('fileStats'),
    fileName: Type.String(),
    stats: Type.Array(
      Type.Object({
        dur: Type.Number(),
        pos: Type.Number(),
        end: Type.Number(),
        types: Type.Number(),
        totalTypes: Type.Number(),
      }),
    ),
  }),
  Type.Object({
    message: Type.Literal('traceStart'),
    projectPath: Type.String(),
    traceDir: Type.String(),
  }),
  Type.Object({
    message: Type.Literal('traceStop'),
  }),
  Type.Object({
    value: Type.Array(Type.Any()),
    message: Type.Literal('log'),
  }),
  Type.Object({
    message: Type.Literal('filterTree'),
    position: Type.Union([Type.Number(), Type.Literal('')]),
    startsWith: Type.String(),
    sourceFileName: Type.String(),
  }),
  Type.Object({
    message: Type.Literal('showTree'),
    step: Type.Union([
      Type.Literal('start'),
      Type.Literal('add'),
      Type.Literal('done'),
    ]),
    nodes: Type.Array(Type.Any()),
  }),
  Type.Object({
    message: Type.Literal('projectOpen'),
    name: Type.String(),
  }),
  Type.Object({
    message: Type.Literal('saveOpen'),
    name: Type.String(),
  }),
  Type.Object({
    message: Type.Literal('projectNames'),
    names: Type.Array(Type.String()),
  }),
  Type.Object({
    message: Type.Literal('saveNames'),
    names: Type.Array(Type.String()),
  }),
  Type.Object({
    id: Type.Number(),
    message: Type.Literal('childrenById'),
    children: Type.Optional(Type.Union([Type.Array(tree), Type.Undefined()])),
  }),
  Type.Object({
    id: Type.Number(),
    message: Type.Literal('typesByTypeId'),
    types: Type.Optional(Type.Array(typeLine)),
  }),
  Type.Object({
    message: Type.Literal('gotoPosition'),
    fileName: Type.String(),
    pos: Type.Number(),
  }),
])

export type MessageType = Message['message']

export type SpecificMessage<T extends MessageType> = Message & { message: T }
export type MessageValues<T extends MessageType> = Omit<SpecificMessage<T>, 'message'>
