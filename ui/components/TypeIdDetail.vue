<script setup lang="ts">
import { typesByTypeId } from '~/src/appState'

const props = defineProps<{ id: number, ancestors: number[], depth: number }>()

const sendMessage = useNuxtApp().$sendMessage

const types = computed(() => typesByTypeId.get(props.id))

onBeforeMount(() => {
  if (!typesByTypeId.has(props.id))
    sendMessage('typesByTypeId', { id: props.id })
})
</script>

<template>
  <div v-for="(type, idx) of types" :key="idx">
    <!-- <span> ancestors: {{ ancestors }} </span> -->
    <span v-if="depth > 10 || ancestors.includes(id)"> id: {{ id }}* </span>
    <TypeDetail v-else-if="type" :type="type" :ancestors="[id, ...ancestors]" :depth="depth + 1" />
  </div>
</template>
