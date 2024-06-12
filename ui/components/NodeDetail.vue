<script setup lang="ts">
import type { Tree } from '../../shared/src/tree'

const props = defineProps<{ node: Tree }>()

const sendMessage = useNuxtApp().$sendMessage

function gotoPosition(key: string) {
  if ('name' in props.node.line) {
    const { path, pos } = props.node.line[key as never] ?? { path: undefined, pos: undefined }
    if (!path || !pos)
      return

    sendMessage('gotoPosition', { fileName: path, pos })
  }
}

/*
const node: Tree = {
  id: 105721,
  parentId: 105357,
  line: {
    pid: 1,
    tid: 1,
    cat: 'checkTypes',
    ph: 'x',
    name: 'structuredTypeRelatedTo',
    args: {
      // @ts-expect-error args not fully typed
      sourceId: 110374,
      targetId: 13568,
      location: {
        line: 5,
        character: 27,
      },
    },
    result: {
      something: 'here',
    },
    ts: 248417.6968319416,
  },
  children: [],
  typeIds: [],
  childCnt: 1,
  childTypeCnt: 2,
  maxDepth: 3,
  typeCnt: 4,
  types: [],
}
  */
</script>

<template>
  <UModal class="w-full" fullscreen>
    <div class="flex flex-col w-full">
      <span>
        {{ props.node.line.name }}
        {{ node.line.dur ? `${node.line.dur}ms` : '' }}
      </span>
      <div class="flex flex-row justify-evenly">
        <ULabled label="Children:">
          {{ node.childCnt }}
        </ULabled>
        <ULabled label="Max Depth:">
          {{ node.maxDepth }}
        </ULabled>
        <ULabled label="Types:">
          {{ node.typeCnt }}
        </ULabled>
        <ULabled label="Child Types:">
          {{ node.childTypeCnt }}
        </ULabled>
      </div>
      <template v-for="ar, arIdx in ['args', 'results', 'result']" :key="arIdx">
        <span> {{ ar }} </span>
        <button v-if="ar in node.line && (node.line[ar as never] as any)?.pos !== undefined" class="mr-2 pb-1 mb-1 bg-[var(--vscode-button-background, green)] rounded-sm focus:ring-[var(--vscode-focusBorder, blue)] focus:outline-none focus:ring-1 " @click="gotoPosition(ar)">
          <UIcon primary name="i-heroicons-arrow-left-on-rectangle" class="relative top-1  hover:backdrop-invert-[10%] hover:invert-[20%] bg-[var(--vscode-button-foreground, white)] " />
        </button>
        <div v-for="(value, idx) in node.line[ar as never] ?? {}" :key="idx" class="flex flex-row pl-4">
          <div v-if="typeof value === 'object'" class="flex flex-col pl-4">
            <template v-for="(childValue, childIdx) in node.line[ar as never]?.[idx] ?? {}" :key="childIdx">
              <ULabled :label="`${childIdx}:`" class="">
                <TypeDetail v-if="typeof childValue === 'number' && ['sourceId', 'targetId', 'id'].includes(childIdx as unknown as string)" :id="childValue" />
                <span v-else>
                  {{ childValue }}
                </span>
              </ULabled>
            </template>
          </div>

          <ULabled v-else :label="`${idx}:`" class="">
            <TypeDetail v-if="typeof value === 'number' && (idx as unknown as string).endsWith('Id')" :id="value" />
            <span v-else>
              {{ value }}
            </span>
          </ULabled>
        </div>
      </template>

      <div style="white-space: pre;">
        {{ JSON.stringify(node.line.args, null, 2) }}
      </div>
    </div>
  </umodal>
</template>
