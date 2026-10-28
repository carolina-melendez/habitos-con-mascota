<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '../components/AppButton.vue'
import PetPortrait from '../components/PetPortrait.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { formatDay, scheduled, validDate } from '../domain/habits'
import { dayLabels, historyDay } from '../domain/history'
import { useHabitsStore } from '../stores/habits'
import { usePreviewStore } from '../stores/preview'
const props = defineProps<{ habitId: string; date: string }>()
const store = useHabitsStore()
const preview = usePreviewStore()
const source = computed(() => store.state.habits.find(h => h.id === props.habitId))
const day = computed(() => source.value && validDate(props.date) && props.date <= store.today ? historyDay(store.state, source.value, props.date, store.today) : null)
const back = computed(() => `/vista-previa/historial?habitId=${props.habitId}${validDate(props.date) ? `&date=${props.date}` : ''}`)
const editable = computed(() => source.value && props.date === store.today && scheduled(source.value, props.date))
</script>
<template>
  <div v-if="day" class="view-stack">
    <ViewHeader :back="back" back-label="Historial" :detail="formatDay(date, true)" />
    <h1 class="multiline" tabindex="-1">{{ day.status === 'complete' ? 'Un pequeño paso\nque floreció.' : day.status === 'partial' || day.status === 'missed' ? 'Un día también\npuede quedar a medias.' : 'Cada día tiene\nsu propio ritmo.' }}</h1>
    <div class="historical-result" :class="{ 'historical-result--complete': day.status === 'complete' }"><p class="label">{{ day.habit.name }}</p><p class="muted">{{ day.record ? day.habit.kind === 'binary' ? (day.amount ? 'Hecho' : 'Pendiente') : `${day.amount} de ${day.target} ${day.habit.unit} registrados` : 'Sin registro guardado' }}</p></div>
    <div class="view-header"><p class="label">Estado</p><p class="caption muted">{{ dayLabels[day.status] }}</p></div>
    <div class="view-header"><p class="label">Meta de ese día</p><p class="caption muted">{{ day.habit.kind === 'binary' ? 'Sí / no' : `${day.target} ${day.habit.unit}` }}</p></div>
    <div class="view-header"><p class="label">Recompensa por cumplir</p><p class="caption muted">{{ day.status === 'complete' ? '10 XP + 5 monedas otorgadas' : 'No otorgada' }}</p></div>
    <p class="muted">{{ date < store.today ? 'Este día está cerrado. Su registro permanece en tu historial.' : source?.archivedOn ? 'Este hábito está archivado. Su registro permanece en tu historial.' : 'Solo puedes corregir registros del día actual.' }}</p>
    <div v-if="preview.profile" class="historical-companion"><img v-if="preview.profile.petId === 'flori'" src="/illustrations/flori-history.svg" alt="Flori" width="144" height="144" /><PetPortrait v-else :pet-id="preview.profile.petId" /><p class="label">Mañana hay espacio<br />para un nuevo brote.</p></div>
    <AppButton v-if="editable" :to="`/vista-previa/habitos/${habitId}`">Ver registro de hoy</AppButton><AppButton :to="back">Volver al historial</AppButton>
  </div>
  <div v-else class="view-stack"><h1 tabindex="-1">Ese día no está disponible.</h1><p>Elige un hábito existente y una fecha hasta hoy.</p><AppButton to="/vista-previa/historial">Volver al historial</AppButton></div>
</template>
