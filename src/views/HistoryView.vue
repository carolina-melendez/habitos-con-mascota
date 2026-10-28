<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppButton from '../components/AppButton.vue'
import PreviewNav from '../components/PreviewNav.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { weekdays } from '../data/templates'
import { formatDay, validDate } from '../domain/habits'
import { dayLabels, historyDay, historySummary, monthCells } from '../domain/history'
import { useHabitsStore } from '../stores/habits'
const store = useHabitsStore()
const route = useRoute()
const selectedId = ref(store.state.habits.find(h => h.id === route.query.habitId)?.id ?? store.state.habits[0]?.id ?? '')
const initialDate = typeof route.query.date === 'string' && validDate(route.query.date) && route.query.date <= store.today ? route.query.date : store.today
const selectedDate = ref(initialDate)
const month = ref(initialDate.slice(0, 7))
const habit = computed(() => store.state.habits.find(h => h.id === selectedId.value) ?? store.state.habits[0])
const minimumMonth = computed(() => habit.value && habit.value.startDate < store.today ? habit.value.startDate.slice(0, 7) : store.today.slice(0, 7))
const validMonth = computed(() => validDate(`${month.value}-01`) && month.value >= minimumMonth.value && month.value <= store.today.slice(0, 7))
const cells = computed(() => validMonth.value && habit.value ? monthCells(month.value).map(date => date ? historyDay(store.state, habit.value!, date, store.today) : null) : [])
const summary = computed(() => habit.value ? historySummary(store.state, habit.value, store.today) : null)
const chosen = computed(() => habit.value ? historyDay(store.state, habit.value, selectedDate.value, store.today) : null)
watch(selectedId, () => { selectedDate.value = store.today; month.value = store.today.slice(0, 7) })
function moveMonth(delta: number) {
  if (!validDate(`${month.value}-01`)) return
  const date = new Date(`${month.value}-01T12:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + delta)
  month.value = date.toISOString().slice(0, 7)
}
</script>
<template>
  <div class="view-stack">
    <ViewHeader back="/vista-previa/mi-dia" back-label="Mi día" detail="Historial" />
    <h1 tabindex="-1">Mira todo lo<br />que ha brotado.</h1><p class="muted">Cada pequeño avance tiene su lugar.</p>
    <template v-if="habit && summary">
      <div class="app-field"><label for="history-habit">Hábito</label><select id="history-habit" v-model="selectedId" class="app-select"><option v-for="item in store.state.habits" :key="item.id" :value="item.id">{{ item.name }}{{ item.archivedOn ? ' · Archivado' : '' }}</option></select></div>
      <div class="month-controls"><button type="button" class="calendar-arrow" aria-label="Mes anterior" :disabled="!validMonth || month <= minimumMonth" @click="moveMonth(-1)">←</button><div class="app-field"><label for="history-month">Mes</label><input id="history-month" v-model="month" type="month" class="app-select" :min="minimumMonth" :max="store.today.slice(0, 7)" /></div><button type="button" class="calendar-arrow" aria-label="Mes siguiente" :disabled="!validMonth || month >= store.today.slice(0, 7)" @click="moveMonth(1)">→</button></div>
      <p v-if="!validMonth" class="field-error" role="alert">Elige un mes entre el inicio del hábito y el mes actual.</p>
      <div v-else class="history-calendar" role="group" aria-label="Calendario del hábito">
        <span v-for="day in weekdays" :key="day.value" class="caption muted calendar-weekday" aria-hidden="true">{{ day.label }}</span>
        <template v-for="(day, index) in cells" :key="day?.date ?? `empty-${index}`"><button v-if="day" type="button" class="calendar-day" :class="[`calendar-day--${day.status}`, { 'calendar-day--selected': selectedDate === day.date }]" :disabled="day.status === 'future'" :aria-pressed="selectedDate === day.date" :aria-label="`${formatDay(day.date, true)}: ${dayLabels[day.status]}`" @click="selectedDate = day.date">{{ Number(day.date.slice(-2)) }}</button><span v-else /></template>
      </div>
      <p class="caption muted">Verde: completado · Durazno: avance parcial · Los días futuros aún no cuentan.</p>
      <div class="reward-grid"><div><p class="big-number">{{ summary.streak }} {{ summary.streak === 1 ? 'día' : 'días' }}</p><p class="caption muted">Racha actual</p></div><div><p class="big-number">{{ summary.completed }} de {{ summary.planned }}</p><p class="caption muted">Programados · últimos 7 días</p></div></div>
      <div v-if="chosen" class="preview-card history-selected" aria-live="polite"><p class="label">{{ formatDay(chosen.date, true) }}</p><p>{{ dayLabels[chosen.status] }}<template v-if="chosen.record"> · {{ chosen.habit.kind === 'binary' ? (chosen.amount ? 'Hecho' : 'Pendiente') : `${chosen.amount} de ${chosen.target} ${chosen.habit.unit}` }}</template></p><GardenLink :to="`/vista-previa/historial/${habit.id}/${chosen.date}`" class="text-link">Ver este día →</GardenLink></div>
      <div class="preview-card"><p class="label">Un brote tras otro</p><p class="muted">Los días de descanso no rompen una racha. El historial conserva la meta que correspondía a cada día.</p></div>
      <AppButton :to="`/vista-previa/habitos/${habit.id}/detalle`">Ver detalle de este hábito</AppButton>
    </template>
    <template v-else><p class="notice">Tu historial empezará con tu primer hábito. Cada pequeño avance tendrá su lugar.</p><AppButton to="/vista-previa/plantillas">Elegir mi primer hábito</AppButton></template>
    <p v-if="store.warning" class="notice" role="status">{{ store.warning }}</p><PreviewNav />
  </div>
</template>
