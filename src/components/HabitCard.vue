<script setup lang="ts">
import { computed } from 'vue'
import type { Habit } from '../domain/habits'
const props = defineProps<{ habit: Habit; amount: number }>()
const completed = computed(() => props.amount >= props.habit.target)
</script>
<template>
  <GardenLink :to="`/vista-previa/habitos/${habit.id}`" class="habit-card" :aria-label="`${habit.name}: ${completed ? 'completado' : 'registrar progreso'}`">
    <span class="label">{{ habit.name }} <span v-if="completed" aria-hidden="true">✓</span></span>
    <span class="caption muted">{{ habit.kind === 'binary' ? (completed ? 'Completado' : 'Pendiente · Registrar') : `${amount} de ${habit.target} ${habit.unit} · ${completed ? 'Completado' : 'Registrar'}` }}<template v-if="habit.time"> · {{ habit.time }}</template></span>
    <progress class="habit-progress" :value="Math.min(amount, habit.target)" :max="habit.target" :aria-label="`Progreso de ${habit.name}`" />
  </GardenLink>
</template>
