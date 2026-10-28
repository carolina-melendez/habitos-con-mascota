<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../components/AppButton.vue'
import AppField from '../components/AppField.vue'
import ViewHeader from '../components/ViewHeader.vue'
import WeekdayPicker from '../components/WeekdayPicker.vue'
import { formatDay, settingsFor, shiftDate, type HabitEdit } from '../domain/habits'
import { useHabitsStore } from '../stores/habits'
const props = defineProps<{ habitId: string }>()
const store = useHabitsStore()
const router = useRouter()
store.sync()
const openedDate = store.today
const fingerprint = store.habitFingerprint(props.habitId)
const source = computed(() => store.state.habits.find(h => h.id === props.habitId))
const habit = computed(() => store.habitForDate(props.habitId, openedDate))
const tomorrow = shiftDate(openedDate, 1)
const initial = source.value ? settingsFor(source.value, tomorrow) : { target: 1, days: [] }
const draft = reactive<HabitEdit>({ name: source.value?.name ?? '', target: initial.target, days: [...initial.days] })
const targetInput = ref(String(draft.target))
const error = ref('')
const saving = ref(false)
async function save() {
  if (saving.value) return
  saving.value = true
  try { await store.edit(props.habitId, { ...draft, target: Number(targetInput.value) }, openedDate, fingerprint); await router.push(`/vista-previa/habitos/${props.habitId}/detalle`) }
  catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos guardar los cambios.' }
  finally { saving.value = false }
}
</script>
<template>
  <form v-if="habit && source && !source.archivedOn" class="view-stack" novalidate @submit.prevent="save">
    <ViewHeader :back="`/vista-previa/habitos/${habitId}/detalle`" back-label="Mi hábito" detail="Editar" />
    <h1 tabindex="-1">Tu rutina<br />puede cambiar.</h1>
    <AppField id="edit-habit-name" v-model="draft.name" label="Nombre del hábito" hint="El nombre cambia al guardar. Los nombres de fechas anteriores se conservan." />
    <AppField v-if="habit.kind === 'quantity'" id="edit-target" v-model="targetInput" type="number" label="Nueva meta diaria" min="1" max="1000" step="1" inputmode="numeric" :hint="`Cantidad entera entre 1 y 1000 ${habit.unit}.`" />
    <p v-else class="caption muted">Este hábito conserva su registro de sí / no.</p>
    <WeekdayPicker v-model="draft.days" />
    <AppField id="edit-from" :model-value="`Mañana · ${formatDay(tomorrow, true)}`" label="Los cambios empiezan" readonly />
    <div class="notice"><p class="label">Hoy se queda como está</p><p class="muted">{{ formatDay(openedDate) }}: {{ habit.kind === 'binary' ? (store.amount(habitId, openedDate) ? 'Completado' : 'Pendiente') : `${store.amount(habitId, openedDate)} / ${habit.target} ${habit.unit}` }}. La nueva meta y frecuencia se aplicarán desde mañana.</p></div>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p><AppButton type="submit" :disabled="saving">Guardar cambios</AppButton><AppButton :to="`/vista-previa/habitos/${habitId}/detalle`" variant="secondary">Cancelar</AppButton><p class="caption muted">Tus registros y recompensas anteriores se conservan. El tipo, unidad, hora objetivo y fecha de inicio permanecen iguales.</p>
  </form>
  <div v-else class="view-stack"><h1 tabindex="-1">Este hábito no se puede editar.</h1><AppButton :to="`/vista-previa/habitos/${habitId}/detalle`">Volver al detalle</AppButton></div>
</template>
