<script setup lang="ts">
import { typesByTypeId } from '~/src/appState'

const props = defineProps<{ id: number }>()

const sendMessage = useNuxtApp().$sendMessage

const types = computed(() => typesByTypeId.get(props.id) ?? [])

function fetchTypes() {
  if (types.value.length === 0)
    sendMessage('typesByTypeId', { id: props.id })
}

onBeforeMount(fetchTypes)
</script>

<template>
  <div>
    <TypeTable class="relative -left-auto right-auto" :types="types" />
  </div>
</template>
