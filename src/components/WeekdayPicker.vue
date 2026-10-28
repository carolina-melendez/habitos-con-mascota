<script setup lang="ts">
import { weekdays } from '../data/templates'
withDefaults(defineProps<{ modelValue: number[]; id?: string }>(), { id: 'habit-days' })
const emit = defineEmits<{ 'update:modelValue': [days: number[]] }>()
</script>
<template>
  <div class="view-stack weekday-field">
    <div class="view-header"><span :id="`${id}-label`" class="label">Frecuencia</span><span class="caption muted">{{ modelValue.length === 7 ? 'Todos los días' : `${modelValue.length} ${modelValue.length === 1 ? 'día' : 'días'} por semana` }}</span></div>
    <div class="weekday-picker" role="group" :aria-labelledby="`${id}-label`"><button v-for="day in weekdays" :key="day.value" type="button" :aria-label="day.name" :aria-pressed="modelValue.includes(day.value)" :class="{ selected: modelValue.includes(day.value) }" @click="emit('update:modelValue', modelValue.includes(day.value) ? modelValue.filter(d => d !== day.value) : [...modelValue, day.value])">{{ day.label }}</button></div>
  </div>
</template>
