<script setup lang="ts">
import { computed, ref } from 'vue'
import AppButton from '../components/AppButton.vue'
import ConfirmationDialog from '../components/ConfirmationDialog.vue'
import PreviewNav from '../components/PreviewNav.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { findTemplate } from '../data/templates'
import { formatDay } from '../domain/habits'
import { dayLabels, daysLabel, historyDay, historySummary, recentDays } from '../domain/history'
import { useHabitsStore } from '../stores/habits'
const props = defineProps<{ habitId: string }>()
const store = useHabitsStore()
const source = computed(() => store.state.habits.find(h => h.id === props.habitId))
const habit = computed(() => store.habitForDate(props.habitId))
const today = computed(() => source.value ? historyDay(store.state, source.value, store.today, store.today) : null)
const summary = computed(() => source.value ? historySummary(store.state, source.value, store.today) : null)
const recent = computed(() => source.value ? recentDays(store.state, source.value, store.today) : [])
const upcoming = computed(() => source.value?.revisions?.find(r => r.from > store.today))
const confirmation = ref<{ date: string; fingerprint: string } | null>(null)
const error = ref('')
function prepareArchive() { store.sync(); confirmation.value = { date: store.today, fingerprint: store.habitFingerprint(props.habitId) } }
async function archive() {
  if (!confirmation.value) return
  try { await store.archive(props.habitId, confirmation.value.date, confirmation.value.fingerprint); error.value = '' }
  catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos archivar el hábito.' }
  confirmation.value = null
}
</script>
<template>
  <div v-if="habit && source && today && summary" class="view-stack">
    <ViewHeader :back="`/vista-previa/historial?habitId=${habitId}`" back-label="Historial" :detail="source.archivedOn ? 'Archivado' : 'Activo'" />
    <h1 tabindex="-1">{{ habit.name }}</h1><p class="muted">{{ findTemplate(habit.templateId)?.description }}</p>
    <div class="notice"><p class="label">Hoy · {{ formatDay(store.today) }}</p><p class="muted">{{ dayLabels[today.status] }}<template v-if="today.record"> · {{ habit.kind === 'binary' ? (today.amount ? 'Hecho' : 'Pendiente') : `${today.amount} de ${today.target} ${habit.unit}` }}</template></p></div>
    <div class="view-header"><p class="label">Meta vigente</p><p class="caption muted">{{ habit.kind === 'binary' ? 'Sí / no' : `${habit.target} ${habit.unit} por día` }}</p></div>
    <div class="view-header"><p class="label">Programación</p><p class="caption muted detail-value">{{ daysLabel(habit.days) }}</p></div>
    <div class="view-header"><p class="label">Racha actual</p><p class="caption muted">{{ summary.streak }} {{ summary.streak === 1 ? 'día' : 'días' }}</p></div>
    <div class="view-header"><p class="label">Mejor racha</p><p class="caption muted">{{ summary.best }} {{ summary.best === 1 ? 'día' : 'días' }}</p></div>
    <p v-if="source.archivedOn" class="notice" role="status">Archivado desde el {{ formatDay(source.archivedOn, true) }}. Tus registros y recompensas se conservan.</p>
    <div v-if="upcoming" class="notice"><p class="label">Cambios programados</p><p>Desde el {{ formatDay(upcoming.from) }}: {{ habit.kind === 'binary' ? 'Sí / no' : `${upcoming.target} ${habit.unit}` }} · {{ daysLabel(upcoming.days) }}.</p></div>
    <h2>Tus últimos días</h2>
    <GardenLink v-for="day in recent" :key="day.date" :to="`/vista-previa/historial/${habitId}/${day.date}`" class="history-row"><span class="label">{{ formatDay(day.date) }}</span><span class="caption muted">{{ day.record && habit.kind === 'quantity' ? `${day.amount} / ${day.target} · ` : '' }}{{ dayLabels[day.status] }}</span></GardenLink>
    <p v-if="!recent.length" class="caption muted">Todavía no hay días programados para mostrar.</p>
    <AppButton v-if="!source.archivedOn" :to="`/vista-previa/habitos/${habitId}`">Ver registro de hoy</AppButton>
    <AppButton v-if="!source.archivedOn" :to="`/vista-previa/habitos/${habitId}/editar`">Editar hábito</AppButton>
    <AppButton v-if="!source.archivedOn" variant="secondary" @click="prepareArchive">Archivar hábito</AppButton>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p><p v-if="store.warning" class="notice" role="status">{{ store.warning }}</p>
    <p class="caption muted">El historial conserva la meta que tenía cada día.</p><PreviewNav />
    <ConfirmationDialog :open="Boolean(confirmation)" title="¿Archivar este hábito desde hoy?" confirm-label="Archivar desde hoy" @cancel="confirmation = null" @confirm="archive"><p>Dejará de aparecer en tu tablero desde hoy. No podrás registrar más avances en este hábito.</p><p>Conservarás su historial, experiencia, monedas y accesorios. Los cambios de meta o frecuencia que estaban pendientes se cancelarán.</p></ConfirmationDialog>
  </div>
  <div v-else class="view-stack"><h1 tabindex="-1">No encontramos ese hábito.</h1><AppButton to="/vista-previa/historial">Volver al historial</AppButton></div>
</template>
