import { Value } from '@sinclair/typebox/value'
import type { Tree, TypeLine } from '../../shared/src/typebox'
import * as Messages from '../../shared/src/typebox'

export const childrenById = shallowReactive(new Map<number, Tree[]>())
export const typesById = shallowReactive(new Map<number, TypeLine[]>())
export const typesByTypeId = shallowReactive(new Map<number, TypeLine[]>())
export const nodes = ref([] as Tree[])
export const sortBy = ref('Timestamp' as keyof typeof sortValue)
export const projectName = ref('')
export const saveName = ref('default')
export const saveNames = ref(['default'] as string[])
export const projectNames = ref([] as string[])

export const files = ref([] as { fileName: string, dirName: string }[])
export const traceRunning = ref(false)

export const autoExpandNodeIds = ref([] as number[])

export const projectPath = ref('')

export const shiftHeld = ref(false)
window.document.addEventListener('keydown', (evt: KeyboardEvent) => {
  if (evt.key === 'Shift')
    shiftHeld.value = true
})
window.document.addEventListener('keyup', (evt: KeyboardEvent) => {
  if (evt.key === 'Shift')
    shiftHeld.value = false
})

const sortValue = {
  'Timestamp': (t: Tree) => t.line.ts,
  'Duration': (t: Tree) => -(t.line.dur ?? 0),
  'Types': (t: Tree) => -t.typeCnt,
  'Total Types': (t: Tree) => -(t.childTypeCnt + t.typeCnt),
} as const

export function doSort(arr: Tree[]) {
  const ord = sortValue[sortBy.value]
  return ord ? arr.toSorted((a, b) => ord(a) - ord(b)) : arr
}

watch(sortBy, () => nodes.value = doSort(nodes.value ?? []))

function handleMessage(e: MessageEvent<unknown>) {
  if (!Value.Check(Messages.message, e.data))
    return

  switch (e.data.message) {
    case 'childrenById': {
      if (!e.data.children)
        return
      const id = e.data.id
      const children = childrenById.get(id) ?? []
      childrenById.set(id, [...children, ...(e.data as any).children])
      // eslint-disable-next-line no-console
      console.log('received children by id', id, children.length)
      break
    }
    case 'typesById': {
      if (!e.data.types)
        return
      const id = e.data.id
      const types = typesById.get(id) ?? []
      typesById.set(id, [...types, ...e.data.types])
      break
    }
    case 'typesByTypeId': {
      if (!e.data.types)
        return
      const id = e.data.id
      const types = typesByTypeId.get(id) ?? []
      typesByTypeId.set(id, [...types, ...e.data.types])
      break
    } case 'showTree': {
      switch (e.data.step) {
        case 'start':
          nodes.value = []
          break
        case 'add':
          nodes.value = doSort([...nodes.value, ...e.data.nodes])
          break
        case 'done':
          break
      }
      break
    }
    case 'projectNames':
      projectNames.value = e.data.names
      break

    case 'saveNames':
      saveNames.value = e.data.names
      break

    case 'saveOpen': {
      saveName.value = e.data.name
      break
    }

    case 'projectOpen': {
      projectName.value = e.data.name
      break
    }

    case 'traceFileLoaded': {
      const data = e.data
      if (data.resetFileList) {
        files.value = []
        nodes.value = []
      }
      if (e.data.fileName && !files.value.some(x => x.fileName === data.fileName && x.dirName === data.dirName))
        files.value.push(e.data)
      break
    }

    case 'traceStart': {
      projectPath.value = e.data.projectPath
      traceRunning.value = true
      break
    }

    case 'traceStop': {
      traceRunning.value = false
      break
    }
  }
}

let wasInit = false
export function init() {
  if (wasInit)
    return

  wasInit = true
  window.addEventListener('message', handleMessage)
}
