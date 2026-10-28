<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../components/AppButton.vue'
import AppField from '../components/AppField.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { findTemplate } from '../data/templates'
import WeekdayPicker from '../components/WeekdayPicker.vue'
import { formatDay, validateDraft, type HabitDraft } from '../domain/habits'
import { useHabitsStore } from '../stores/habits'
const props = defineProps<{ templateId: string }>()
const store = useHabitsStore()
const router = useRouter()
const template = computed(() => findTemplate(props.templateId))
const draft = reactive<HabitDraft>({ templateId: props.templateId, name: '', kind: 'quantity', unit: 'vasos', target: 8, days: [0, 1, 2, 3, 4, 5, 6], startDate: store.today })
const error = ref('')
const saving = ref(false)
watch(template, t => {
  store.refreshDay()
  if (t) Object.assign(draft, { templateId: t.id, name: t.name, kind: t.kind, unit: t.units[0], target: t.target, days: [0, 1, 2, 3, 4, 5, 6], startDate: store.today, time: t.time })
  error.value = ''
}, { immediate: true })
watch(() => draft.kind, kind => { if (kind === 'binary') { draft.target = 1; draft.unit = 'veces' } })
const startLabel = computed(() => { try { return formatDay(draft.startDate) } catch { return 'la fecha elegida' } })
async function save() {
  if (saving.value) return
  store.refreshDay()
  error.value = validateDraft(draft, store.today) ?? ''
  if (error.value) return
  saving.value = true
  try { await store.create(draft); await router.push('/vista-previa/mi-dia') }
  catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos guardar el hábito.' }
  finally { saving.value = false }
}
</script>
<template>
  <form v-if="template" class="view-stack" novalidate @submit.prevent="save">
    <ViewHeader back="/vista-previa/plantillas" back-label="Plantillas" detail="Nuevo hábito" />
    <h1 class="multiline" tabindex="-1">{{ template.title }}</h1>
    <p class="muted">{{ template.id === 'agua' ? 'Personaliza tu hábito de agua.' : template.description }}</p>
    <AppField id="habit-name" v-model="draft.name" label="Nombre del hábito" placeholder="Tu pequeño hábito" autocomplete="off" />
    <div v-if="template.id === 'propio'" class="app-field"><label for="habit-kind">Cómo registrarás el progreso</label><select id="habit-kind" v-model="draft.kind" class="app-select"><option value="binary">Sí / no</option><option value="quantity">Cantidad</option></select></div>
    <div v-if="template.units.length > 1" class="app-field"><label for="habit-unit">Unidad de tu meta</label><select id="habit-unit" v-model="draft.unit" class="app-select"><option v-for="unit in template.units" :key="unit">{{ unit }}</option></select></div>
    <AppField v-if="template.id === 'propio' && draft.kind === 'quantity'" id="custom-unit" v-model="draft.unit" label="Unidad de tu meta" placeholder="Ej. páginas, minutos, veces" />
    <template v-if="draft.kind === 'quantity'">
      <label class="label" for="habit-target">{{ template.id === 'agua' ? '¿Cuántos vasos al día?' : '¿Cuál será tu meta diaria?' }}</label>
      <div class="target-stepper">
        <button type="button" aria-label="Reducir meta" :disabled="draft.target <= 1" @click="draft.target--">−</button>
        <div><input id="habit-target" v-model.number="draft.target" type="number" min="1" max="1000" step="1" inputmode="numeric" /><span>{{ draft.unit }}</span></div>
        <button type="button" aria-label="Aumentar meta" :disabled="draft.target >= 1000" @click="draft.target++">+</button>
      </div>
      <p v-if="template.hint" class="caption muted">{{ template.hint }}</p>
    </template>
    <AppField v-if="template.id === 'descanso'" id="habit-time" :model-value="draft.time ?? ''" type="time" label="Hora objetivo" @update:model-value="draft.time = $event" hint="Una referencia para tu rutina; tú marcas cuándo lo completaste." />
    <WeekdayPicker v-model="draft.days" />
    <AppField id="habit-start" v-model="draft.startDate" label="Fecha de inicio" type="date" :min="store.today" />
    <div class="preview-card"><p class="label">Así aparecerá en tu tablero</p><p>{{ draft.name || 'Tu hábito' }} · {{ draft.kind === 'binary' ? 'Pendiente' : `0 de ${draft.target} ${draft.unit}` }}</p><p class="caption muted">{{ draft.days.length === 7 ? 'Cada día' : 'Los días que elegiste' }}, desde el {{ startLabel }}.</p></div>
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <AppButton type="submit" :disabled="saving">Guardar hábito</AppButton>
  </form>
  <div v-else class="view-stack"><h1 tabindex="-1">No encontramos esa plantilla.</h1><AppButton to="/vista-previa/plantillas">Volver a las plantillas</AppButton></div>
</template>
