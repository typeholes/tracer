import type { TraceLine } from './typebox'

export interface Tree {
  id: number
  parentId: number
  line: TraceLine
  children: Tree[]
  typeIds: number[]
  childCnt: number
  maxDepth: number
  childTypeCnt: number
  typeCnt: number
  typeRecursionId?: number
}
