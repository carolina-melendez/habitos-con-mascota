<script setup lang="ts">
defineProps<{ back?: string; backLabel?: string; detail?: string }>()
</script>

<template>
  <header class="view-header">
    <GardenLink v-if="back" :to="back" class="text-link">← &nbsp;{{ backLabel ?? 'Brotito' }}</GardenLink>
    <GardenLink v-else to="/" class="text-link">Brotito</GardenLink>
    <span v-if="detail" class="caption muted">{{ detail }}</span>
  </header>
</template>
