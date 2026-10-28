<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../components/AppButton.vue'
import AppField from '../components/AppField.vue'
import ConfirmationDialog from '../components/ConfirmationDialog.vue'
import PetPortrait from '../components/PetPortrait.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { formatDay, scheduled } from '../domain/habits'
import { findAccessory } from '../domain/commerce'
import { useHabitsStore } from '../stores/habits'
import { usePreviewStore } from '../stores/preview'
const props = defineProps<{ habitId: string }>()
const store = useHabitsStore()
const preview = usePreviewStore()
const router = useRouter()
const entryDate = ref(store.today)
const habit = computed(() => store.habitForDate(props.habitId, entryDate.value))
const current = computed(() => store.amount(props.habitId, entryDate.value))
const complete = computed(() => Boolean(habit.value && current.value >= habit.value.target))
const editable = computed(() => Boolean(habit.value && entryDate.value === store.today && scheduled(habit.value, store.today)))
const delta = ref('1')
const error = ref('')
const pending = ref<Awaited<ReturnType<typeof store.reviewChange>> | null>(null)
const busy = ref(false)
const isWater = computed(() => habit.value?.templateId === 'agua')
const remainingLabel = computed(() => {
  const count = (habit.value?.target ?? 0) - current.value
  const singular: Record<string, string> = { vasos: 'vaso', minutos: 'minuto', 'páginas': 'página', veces: 'vez' }
  const unit = habit.value?.unit ?? ''
  return `${count === 1 ? 'Te falta' : 'Te faltan'} ${count} ${count === 1 ? (singular[unit] ?? unit) : unit} para completar hoy.`
})
async function add() {
  if (busy.value || !habit.value) return
  busy.value = true
  error.value = ''
  try {
    const step = isWater.value ? 1 : Number(delta.value)
    if (habit.value.kind === 'quantity' && (!Number.isSafeInteger(step) || step < 1)) throw new Error('Escribe una cantidad entera mayor que cero.')
    const reward = await (habit.value.kind === 'binary' ? store.update(props.habitId, entryDate.value, 1) : store.adjust(props.habitId, entryDate.value, step))
    if (reward.xp > 0) await router.push(`/vista-previa/habitos/${props.habitId}/completado`)
  } catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos guardar el registro.' }
  finally { busy.value = false }
}
async function remove() {
  if (busy.value) return
  store.sync()
  if (!habit.value || current.value <= 0 || !editable.value) return
  const next = habit.value.kind === 'binary' ? 0 : current.value - 1
  error.value = ''
  busy.value = true
  try {
    const plan = await store.reviewChange(props.habitId, entryDate.value, next)
    if (plan.delta.xp < 0) pending.value = plan
    else await applyCorrection(plan)
  } catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos preparar la corrección.' }
  finally { busy.value = false }
}
async function applyCorrection(plan: Awaited<ReturnType<typeof store.reviewChange>>) {
  error.value = ''
  try {
    await store.update(props.habitId, entryDate.value, plan.amount, plan.fingerprint)
  } catch (e) { error.value = e instanceof Error ? e.message : 'No pudimos corregir el registro.' }
  pending.value = null
}
</script>
<template>
  <div v-if="habit" class="view-stack">
    <ViewHeader back="/vista-previa/mi-dia" back-label="Mi día" :detail="`${entryDate === store.today ? 'Hoy' : 'Registro'}, ${formatDay(entryDate)}`" />
    <h1 tabindex="-1">{{ isWater ? 'Tu pausa' : habit.name }}<br v-if="isWater" /><template v-if="isWater">para tomar agua.</template></h1>
    <p class="muted">{{ isWater ? 'Cada vaso suma a tu meta de hoy.' : 'Cada pequeño paso cuenta.' }}</p>
    <GardenLink :to="`/vista-previa/habitos/${habitId}/detalle`" class="text-link">Ver detalle y editar hábito</GardenLink>
    <section class="registration-progress" aria-label="Progreso registrado">
      <p class="big-number">{{ habit.kind === 'binary' ? (complete ? 'Completado ✓' : 'Un paso para hoy') : `${current} de ${habit.target}` }}</p>
      <p class="muted">{{ habit.kind === 'binary' ? 'Tu rutina, a tu ritmo.' : isWater ? 'vasos registrados' : `${habit.unit} de hoy` }}</p>
      <div v-if="isWater && habit.target <= 30" class="glass-grid" aria-hidden="true"><img v-for="glass in habit.target" :key="glass" :src="`/illustrations/glass-${glass <= current ? 'filled' : 'empty'}.svg`" width="48" height="54" alt="" /></div>
      <progress v-else-if="habit.kind === 'quantity'" class="habit-progress" :max="habit.target" :value="Math.min(current, habit.target)" aria-label="Progreso de hoy" />
      <p class="caption muted" role="status">{{ complete ? 'Tu meta de hoy está completa.' : habit.kind === 'binary' ? 'Marca tu hábito cuando lo hayas hecho.' : remainingLabel }}</p>
      <p v-if="habit.time" class="caption muted">Hora objetivo: {{ habit.time }}</p>
    </section>
    <div v-if="!editable" class="notice" role="status">{{ entryDate !== store.today ? 'Cambió el día. Este registro ya no se puede modificar.' : 'Este hábito no está programado para hoy.' }} <GardenLink class="text-link" to="/vista-previa/mi-dia">Ver mi día actual</GardenLink></div>
    <AppField v-if="habit.kind === 'quantity' && !isWater" id="record-amount" v-model="delta" type="number" label="Cantidad a añadir" inputmode="numeric" min="1" step="1" />
    <p v-if="error" class="field-error" role="alert">{{ error }}</p>
    <AppButton :disabled="!editable || busy || (habit.kind === 'binary' && complete)" @click="add">{{ habit.kind === 'binary' ? (complete ? 'Completado hoy' : 'Marcar como completado') : isWater ? 'Añadir un vaso' : 'Añadir progreso' }}</AppButton>
    <AppButton variant="secondary" :disabled="!editable || current === 0 || busy" @click="remove">{{ habit.kind === 'binary' ? 'Corregir: marcar pendiente' : isWater ? '− Quitar el último vaso' : `− Quitar una unidad` }}</AppButton>
    <p class="caption muted">Puedes corregir hoy hasta las 23:59, según tu zona horaria ({{ store.state.timezone }}). No hay recompensa extra por superar la meta.</p>
    <div v-if="store.warning" class="notice" role="status">{{ store.warning }}</div>
    <div v-if="preview.profile" class="companion-card"><img v-if="preview.profile.petId === 'flori'" src="/illustrations/flori-companion.svg" width="81" height="81" alt="Flori" /><PetPortrait v-else :pet-id="preview.profile.petId" variant="card" /><p>Vamos a tu ritmo.<br />Un brote a la vez.</p></div>
    <ConfirmationDialog :open="Boolean(pending)" title="Antes de corregir" @cancel="pending = null" @confirm="pending && applyCorrection(pending)">
      <template v-if="pending"><p>El hábito quedará pendiente. Se retirarán 10 de experiencia y 5 monedas de esta recompensa.</p>
      <div class="correction-summary"><p>Experiencia: {{ pending.beforeXp }} → {{ pending.afterXp }}</p><p>Monedas: {{ pending.beforeBalance }} → {{ pending.afterBalance }}</p><p>Racha: {{ pending.beforeStreak }} → {{ pending.afterStreak }} días</p><p v-if="pending.beforeStage !== pending.afterStage">Etapa: {{ pending.beforeStage }} → {{ pending.afterStage }}</p></div>
      <template v-if="pending.returned.length"><p>Para cubrir la corrección, volverán a la tienda estas compras, desde la más reciente:</p><ul class="returned-list"><li v-for="purchase in [...pending.returned].reverse()" :key="purchase.id">{{ findAccessory(purchase.itemId)?.name }} · devolución de {{ purchase.paid }} monedas</li></ul><p class="caption muted">Se retirarán de tu armario y dejarán de estar equipadas.</p></template>
      <p v-else class="caption muted">Tu saldo cubre la corrección. Conservarás tus accesorios.</p>
      <p class="caption muted">Si vuelves a completar hoy, recuperarás la recompensa una sola vez.</p>
      <p v-if="pending.returned.length" class="caption muted">Las compras devueltas no se vuelven a comprar automáticamente.</p></template>
    </ConfirmationDialog>
  </div>
  <div v-else class="view-stack"><h1 tabindex="-1">No encontramos ese hábito.</h1><AppButton to="/vista-previa/mi-dia">Volver a mi día</AppButton></div>
</template>
