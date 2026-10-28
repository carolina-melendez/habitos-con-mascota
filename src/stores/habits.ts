import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { HABITS_KEY, archiveHabit, changeProgress, dateInZone, editHabit, emptyHabitState, habitOnDate, parseHabitState, previewProgress, recordFor, rewards, scheduled, streakFor, validateDraft, type HabitDraft, type HabitEdit, type HabitState } from '../domain/habits'
import { balance, buy, equip, owned, stageFor, unequip,findAccessory } from '../domain/commerce'
import { useAccountStore } from './account'
import { getSupabase } from '../lib/supabase'

export const useHabitsStore = defineStore('habits', () => {
  let raw: string | null = null
  const warning = ref('')
  let pendingPersistence = false
  try { raw = localStorage.getItem(HABITS_KEY) } catch { warning.value = 'El navegador no permite leer tus hábitos guardados.' }
  const parsed = parseHabitState(raw)
  if (raw && !parsed) warning.value = 'No pudimos leer los hábitos guardados. Esta vista previa empieza vacía.'
  const account = useAccountStore()
  const localState = ref(parsed ?? emptyHabitState())
  const state = computed({get: () => account.mode ? account.garden?.state ?? emptyHabitState() : localState.value, set: value => { if (!account.mode) localState.value = value }})
  const localToday = ref(dateInZone(new Date(), localState.value.timezone))
  const today = computed(() => account.mode ? account.garden?.today ?? localToday.value : localToday.value)
  const totals = computed(() => { if (account.mode) return {xp:account.garden?.totals.xp ?? 0,coins:account.garden?.totals.saldo ?? 0}; const earned = rewards(state.value); return { xp: earned.xp, coins: balance(state.value.commerce, earned.coins) } })
  const stage = computed(() => stageFor(totals.value.xp))
  const todaysHabits = computed(() => state.value.habits.filter(h => scheduled(h, today.value)).map(h => habitOnDate(h, today.value)))
  const laterHabits = computed(() => state.value.habits.filter(h => !h.archivedOn && !scheduled(h, today.value)).map(h => habitOnDate(h, today.value)))
  function refreshDay() { if (!account.mode) localToday.value = dateInZone(new Date(), state.value.timezone) }
  function applyExternal(raw: string | null) {
    if (account.mode) return
    if (pendingPersistence) { warning.value = 'Hay cambios sin guardar en esta pantalla. Los cambios de otra pestaña no los reemplazarán.'; return }
    const parsed = parseHabitState(raw)
    if (raw && !parsed) { warning.value = 'No pudimos leer los cambios de otra pestaña.'; return }
    state.value = parsed ?? emptyHabitState(state.value.timezone)
    refreshDay()
  }
  function sync() {
    if (account.mode) return
    refreshDay()
    if (pendingPersistence) return
    try {
      const stored = parseHabitState(localStorage.getItem(HABITS_KEY))
      if (stored) { state.value = stored; refreshDay() }
    } catch { /* Keep the in-memory preview usable if storage is blocked. */ }
  }
  function persist() {
    if (account.mode) throw new Error('Los datos de cuenta se guardan en Supabase.')
    try { localStorage.setItem(HABITS_KEY, JSON.stringify(state.value)); warning.value = ''; pendingPersistence = false }
    catch { warning.value = 'Tus cambios siguen en esta pantalla, pero no se conservarán al recargar.'; pendingPersistence = true }
  }
  function create(draft: HabitDraft) {
    sync()
    const error = validateDraft(draft, today.value)
    if (error) throw new Error(error)
    if (account.mode) return account.mutate<string>('brotito_crear_habito', {
      p_nombre:draft.name,p_tipo:draft.kind,p_unidad:draft.unit,p_meta:draft.target,p_dias:draft.days,
      p_inicio:draft.startDate,p_plantilla:draft.templateId === 'propio' ? null : draft.templateId,p_hora:draft.time ?? null,
    }).then(id=>{const habit = state.value.habits.find(h=>h.id===id); if (!habit) throw new Error('Actualiza tu jardín para ver el hábito guardado.'); return habit})
    const habit = { ...draft, name: draft.name.trim(), unit: draft.unit.trim(), days: [...draft.days], id: crypto.randomUUID() }
    state.value.habits.push(habit)
    persist()
    return habit
  }
  function amount(habitId: string, date = today.value) { return recordFor(state.value, habitId, date)?.amount ?? 0 }
  function habitForDate(habitId: string, date = today.value) {
    const habit = state.value.habits.find(h => h.id === habitId)
    return habit ? habitOnDate(habit, date) : undefined
  }
  function habitFingerprint(habitId: string) { return JSON.stringify([account.mode ? account.userId : 'local',account.mode ? account.garden?.revision : null,state.value.habits.find(h => h.id === habitId)]) }
  function verifyHabitReview(habitId: string, date: string, fingerprint: string) {
    sync()
    if (date !== today.value) throw new Error('Cambió el día. Abre de nuevo el hábito antes de guardar.')
    if (fingerprint !== habitFingerprint(habitId)) throw new Error('Este hábito cambió en otra pantalla. Ábrelo de nuevo para revisar los cambios.')
  }
  function edit(habitId: string, draft: HabitEdit, date: string, fingerprint: string) {
    verifyHabitReview(habitId, date, fingerprint)
    if (account.mode) return account.mutate('brotito_editar_habito',{p_habito:habitId,p_nombre:draft.name,p_meta:draft.target,p_dias:draft.days},account.garden?.revision,date)
    const from = editHabit(state.value, habitId, draft)
    persist()
    return from
  }
  function archive(habitId: string, date: string, fingerprint: string) {
    verifyHabitReview(habitId, date, fingerprint)
    if (account.mode) return account.mutate('brotito_archivar_habito',{p_habito:habitId},account.garden?.revision,date)
    archiveHabit(state.value, habitId)
    persist()
  }
  function reviewChange(habitId: string, date: string, amount: number) {
    sync()
    if (account.mode) return reviewCloud(habitId,date,amount)
    return previewProgress(state.value, habitId, date, amount)
  }
  async function reviewCloud(habitId: string,date: string,amount: number) {
    if (!account.ready || !account.garden) throw new Error('Actualiza tu jardín antes de corregir.')
    const revision = account.garden.revision; const owner = account.userId
    const {data,error} = await getSupabase().rpc('brotito_previsualizar_registro',{p_habito:habitId,p_cantidad:amount,p_revision:revision,p_fecha:date}).setHeader('Authorization',`Bearer ${account.session!.access_token}`)
    if (error) throw new Error(error.code === '40001' ? 'Tu progreso cambió. Actualiza y revisa de nuevo.' : 'No pudimos preparar la corrección. Intenta de nuevo.')
    if (owner !== account.userId || !account.ready || revision !== account.garden?.revision) throw new Error('La cuenta o el progreso cambiaron. Revisa de nuevo.')
    const returned = state.value.commerce.purchases.filter(p => data.devueltas.some((d:{id:string}) => d.id === p.id)).map(p=>({...p,status:'returned' as const}))
    const after:HabitState = JSON.parse(JSON.stringify(state.value))
    after.records = after.records.filter(r=>r.habitId !== habitId || r.date !== date)
    after.records.push({habitId,date,amount,target:data.meta_del_dia})
    return {amount,beforeStreak:streakFor(state.value,habitId,date),afterStreak:streakFor(after,habitId,date),beforeXp:data.antes.xp,afterXp:data.despues.xp,beforeBalance:data.antes.saldo,afterBalance:data.despues.saldo,
      beforeStage:data.antes.etapa,afterStage:data.despues.etapa,returned,fingerprint:JSON.stringify([owner,revision]),delta:{xp:data.despues.xp-data.antes.xp,coins:data.despues.monedas_ganadas-data.antes.monedas_ganadas}}
  }
  function update(habitId: string, date: string, amount: number, reviewedFingerprint?: string) {
    sync()
    if (account.mode) {
      const fingerprint = JSON.stringify([account.userId,account.garden?.revision])
      if (reviewedFingerprint !== undefined && reviewedFingerprint !== fingerprint) throw new Error('Tu progreso cambió. Revisa de nuevo.')
      return account.mutate<{antes:{xp:number;monedas_ganadas:number};despues:{xp:number;monedas_ganadas:number}}>('brotito_guardar_registro',
        {p_habito:habitId,p_cantidad:amount,p_confirmar:reviewedFingerprint !== undefined},account.garden?.revision,date)
        .then(plan => ({xp:plan.despues.xp-plan.antes.xp,coins:plan.despues.monedas_ganadas-plan.antes.monedas_ganadas}))
    }
    const plan = previewProgress(state.value, habitId, date, amount)
    if (reviewedFingerprint !== undefined && reviewedFingerprint !== plan.fingerprint) throw new Error('El progreso o las compras cambiaron. Revisa la corrección otra vez antes de confirmar.')
    if (plan.delta.xp < 0 && reviewedFingerprint !== plan.fingerprint) throw new Error('Revisa y confirma los efectos antes de corregir un hábito completado.')
    const reward = changeProgress(state.value, habitId, date, amount)
    persist()
    return reward
  }
  function adjust(habitId: string, date: string, delta: number) {
    sync()
    return update(habitId, date, amount(habitId, date) + delta)
  }
  function purchase(itemId: string, reviewedBalance: number) {
    sync()
    if (totals.value.coins !== reviewedBalance) throw new Error('Tu saldo cambió. Revisa el precio y el saldo antes de comprar.')
    if (account.mode) return account.mutate('brotito_comprar',{p_accesorio:itemId})
    const purchase = buy(state.value.commerce, itemId, rewards(state.value).coins)
    persist()
    return purchase
  }
  function equipItem(itemId: string) {
    if (account.mode) { const purchase = state.value.commerce.purchases.find(p=>p.itemId===itemId && p.status==='owned'); if (!purchase) throw new Error('No tienes este accesorio.'); return account.mutate('brotito_equipar',{p_compra:purchase.id}) }
    sync(); equip(state.value.commerce, itemId); persist()
  }
  function unequipItem(itemId: string) {
    if (account.mode) return account.mutate('brotito_quitar_accesorio',{p_categoria:findAccessory(itemId)?.slot ?? null})
    sync(); unequip(state.value.commerce, itemId); persist()
  }
  function owns(itemId: string) { return owned(state.value.commerce, itemId) }
  function clear() {
    if (account.mode) throw new Error('El borrado local no está disponible en una cuenta.')
    pendingPersistence = false
    state.value = emptyHabitState(state.value.timezone)
    refreshDay()
    try { localStorage.removeItem(HABITS_KEY); warning.value = '' }
    catch { warning.value = 'El navegador no permite borrar los datos guardados.' }
  }
  return { state, today, totals, stage, todaysHabits, laterHabits, warning, refreshDay, applyExternal, sync, create, amount, habitForDate, habitFingerprint, edit, archive, update, adjust, reviewChange, purchase, equipItem, unequipItem, owns, clear }
})
