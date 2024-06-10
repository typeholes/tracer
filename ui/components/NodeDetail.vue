<script setup lang="ts">
import type { Tree } from '../../shared/src/tree'

const props = defineProps<{ node: Tree }>()
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
      <template v-for="ar, arIdx in ['args', 'result']" :key="arIdx">
        <span> {{ ar }} </span>
        <div v-for="(value, idx) in node.line[ar as never] ?? {}" :key="idx" class="flex flex-row pl-4">
          <div v-if="typeof value === 'object'" class="flex flex-col pl-4">
            <template v-for="(childValue, childIdx) in node.line[ar as never]?.[idx] ?? {}" :key="childIdx">
              <ULabled :label="`${childIdx}:`" class="">
                <TypeDetail v-if="typeof childValue === 'number' && (childIdx as unknown as string).endsWith('Id')" :id="childValue" />
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
        {{ JSON.stringify(node, null, 2) }}
      </div>
    </div>
  </umodal>
</template>
