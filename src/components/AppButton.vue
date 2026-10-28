<script setup lang="ts">
withDefaults(defineProps<{ to?: string; variant?: 'primary' | 'secondary'; type?: 'button' | 'submit'; disabled?: boolean }>(), { variant: 'primary', type: 'button' })
</script>

<template>
  <GardenLink v-if="to" :to="to" class="app-button" :class="`app-button--${variant}`"><slot /></GardenLink>
  <button v-else class="app-button" :class="`app-button--${variant}`" :type="type" :disabled="disabled"><slot /></button>
</template>
