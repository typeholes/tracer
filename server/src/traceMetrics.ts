import { join } from 'node:path'
import type { MessageValues } from '../../shared/src/typebox'
import { workspacePath } from './serverState'
import { type Tree, getProgram, getTypeDictionary, treeIdNodes, typeToDescriptor } from './tsTrace'
import { filterTree } from './receiveMessage.tb'

export const processedFiles = new Set<string>()

export function getChildrenById(id: number) {
  const nodes = treeIdNodes.get(id)?.children ?? []
  const ret: typeof nodes = []
  nodes.forEach((node) => {
    // treeIdNodes.set(node.id, node)
    ret.push({ ...node, children: [], typeIds: [] })
  })
  return ret
}

export function getTypesByTypeId(id: number) {
  return getTypesById(0, [id])
}

export function getTypesById(id: number, typeIds?: number[]) {
  const ids = typeIds ?? treeIdNodes.get(id)?.typeIds
  const typeDictionary = getTypeDictionary()
  if (!ids)
    return []

  const ret = ids.map((id, idx) => {
    const type = typeDictionary.get(id)
    if (!type)
      throw new Error(`type id not found ${ids[idx]}`)

    return typeToDescriptor(type)
  })

  const checker = getProgram()?.getTypeChecker()
  if (!checker)
    return ret

  for (const line of ret) {
    if (!line.display) {
      const type = typeDictionary.get(line.id)
      if (type)
        line.display = checker.typeToString(type)
    }
  }
  return ret
}

type FileStat = MessageValues<'fileStats'>['stats'][0]

export function getStatsFromTree(fileName: string) {
  const stats: FileStat[] = []
  function visit(node: Tree) {
    if ('name' in node.line) {
      const line = node.line
      if (
        line.dur
        && line.args?.path
        && join(workspacePath.value, line.args.path) === fileName
        && line.args?.pos
        && line.args?.end
      ) {
        const types = node.typeIds.length
        stats.push({
          dur: line.dur,
          pos: line.args.pos,
          end: line.args.end,
          types,
          totalTypes: types + node.childTypeCnt,
        })
      }
    }
    node.children.forEach(visit)
  }

  const fileNodes = filterTree('', fileName, 0)
  fileNodes.forEach(visit)

  return stats
}

// export function getTreeAtIndex(idx: number) {
//   return treeIndexes[idx]
// }
