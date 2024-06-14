<script setup lang="ts">
import type { TypeLine } from '../../shared/src/typebox'

const props = defineProps<{ type: TypeLine, ancestors: number[], depth: number }>()
</script>

<template>
  <div>
    <ULabled label="id">
      {{ props.type.id }}
    </ulabled>
    <ULabled label="display">
      {{ type.display }}
    </ulabled>
    <ULabled v-if="'firstDeclaration' in type" label="Declaration">
      {{ (type.firstDeclaration as any)?.path }} {{ (type.firstDeclaration as any)?.start.line }}:{{ (type.firstDeclaration as any)?.start.character }}
    </ulabled>
    <ULabled v-if="'instantiatedType' in type" label="Instantiated">
      <TypeIdDetail :id="type.instantiatedType as number" :ancestors="ancestors" :depth="depth + 1" />
    </ulabled>
    <ULabled v-if="'typeArguments' in type" label="Type Arguments">
      <div v-for="argId of type.typeArguments" :key="argId" class="flex flex-col">
        <TypeIdDetail :id="argId as number" :ancestors="ancestors" :depth="depth + 1" />
      </div>
    </ulabled>
  </div>
</template>
