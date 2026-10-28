import { findTemplate } from '../data/templates'
import { balance, emptyCommerce, parseCommerce, reconcilePurchases, stageFor, type CommerceState } from './commerce'

export const HABITS_KEY = 'brotito.habits.v1'
export interface HabitRevision { from: string; target: number; days: number[] }
export interface Habit { id: string; templateId: string; name: string; kind: 'quantity' | 'binary'; unit: string; target: number; days: number[]; startDate: string; time?: string; revisions?: HabitRevision[]; nameHistory?: { from: string; name: string }[]; archivedOn?: string }
export type HabitDraft = Pick<Habit, 'templateId' | 'name' | 'kind' | 'unit' | 'target' | 'days' | 'startDate' | 'time'>
export interface HabitEdit { name: string; target: number; days: number[] }
export interface HabitRecord { habitId: string; date: string; amount: number; target: number }
export interface HabitState { version: 1; timezone: string; habits: Habit[]; records: HabitRecord[]; commerce: CommerceState }
export function dateInZone(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-')
}
export function validDate(date: unknown): date is string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = new Date(`${date}T12:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}
export function formatDay(date: string, long = false) {
  return new Intl.DateTimeFormat('es-SV', long ? { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`))
}
export function validateDraft(draft: HabitDraft, today?: string): string | undefined {
  const template = findTemplate(draft.templateId)
  if (!template) return 'Elige una plantilla válida.'
  if (typeof draft.name !== 'string' || !draft.name.trim() || Array.from(draft.name.trim()).length > 60) return 'Escribe un nombre de 1 a 60 caracteres.'
  if (!['quantity', 'binary'].includes(draft.kind) || (draft.templateId !== 'propio' && draft.kind !== template.kind)) return 'Elige un tipo de registro válido.'
  if (!Number.isSafeInteger(draft.target) || draft.target < 1 || draft.target > 1000 || (draft.kind === 'binary' && draft.target !== 1)) return 'La meta debe ser un número entero entre 1 y 1000.'
  if (typeof draft.unit !== 'string' || !draft.unit.trim() || Array.from(draft.unit.trim()).length > 20 || (draft.templateId !== 'propio' && !template.units.includes(draft.unit))) return 'Elige una unidad válida, de hasta 20 caracteres.'
  if (!Array.isArray(draft.days) || !draft.days.length || new Set(draft.days).size !== draft.days.length || draft.days.some(d => !Number.isInteger(d) || d < 0 || d > 6)) return 'Selecciona al menos un día de la semana.'
  if (!validDate(draft.startDate) || (today && draft.startDate < today)) return 'Elige una fecha de inicio desde hoy.'
  if ((draft.templateId === 'descanso' && !draft.time) || (draft.time !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.time))) return 'Elige una hora válida.'
}
export function shiftDate(date: string, days: number) { return new Date(new Date(`${date}T12:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10) }
export function settingsFor(habit: Habit, date: string): Pick<Habit, 'target' | 'days'> {
  const revision = habit.revisions?.filter(r => r.from <= date).at(-1)
  return revision ? { target: revision.target, days: [...revision.days] } : { target: habit.target, days: [...habit.days] }
}
export function habitOnDate(habit: Habit, date: string): Habit {
  const { revisions: _revisions, nameHistory: _names, ...base } = habit
  const name = habit.nameHistory?.filter(n => n.from <= date).at(-1)?.name ?? habit.nameHistory?.[0]?.name ?? habit.name
  return { ...base, ...settingsFor(habit, date), name }
}
export function scheduled(habit: Habit, date: string) {
  return validDate(date) && date >= habit.startDate && (!habit.archivedOn || date < habit.archivedOn) && settingsFor(habit, date).days.includes(new Date(`${date}T12:00:00Z`).getUTCDay())
}
export function editHabit(state: HabitState, habitId: string, draft: HabitEdit, now = new Date()) {
  const habit = state.habits.find(h => h.id === habitId)
  if (!habit || habit.archivedOn) throw new Error('Solo puedes editar hábitos activos.')
  const error = validateDraft({ ...habit, ...draft })
  if (error) throw new Error(error)
  const today = dateInZone(now, state.timezone)
  const tomorrow = shiftDate(today, 1)
  const name = draft.name.trim()
  if (name !== habit.name) {
    const names = habit.nameHistory ?? [{ from: habit.startDate, name: habit.name }]
    habit.nameHistory = [...names.filter(n => n.from < today), { from: today, name }]
    habit.name = name
  }
  const previous = (habit.revisions ?? []).filter(r => r.from < tomorrow)
  const baseline = previous.at(-1) ?? habit
  const sameDays = [...baseline.days].sort().join(',') === [...draft.days].sort().join(',')
  habit.revisions = [...previous, ...(baseline.target !== draft.target || !sameDays ? [{ from: tomorrow, target: draft.target, days: [...draft.days] }] : [])]
  return tomorrow
}
export function archiveHabit(state: HabitState, habitId: string, now = new Date()) {
  const habit = state.habits.find(h => h.id === habitId)
  if (!habit || habit.archivedOn) throw new Error('Este hábito ya no está activo.')
  habit.archivedOn = dateInZone(now, state.timezone)
  habit.revisions = habit.revisions?.filter(r => r.from <= habit.archivedOn!)
}
export function recordFor(state: HabitState, habitId: string, date: string) { return state.records.find(r => r.habitId === habitId && r.date === date) }
export function rewards(state: HabitState) {
  const count = state.records.filter(r => r.amount >= r.target).length
  return { xp: count * 10, coins: count * 5 }
}
export function changeProgress(state: HabitState, habitId: string, date: string, amount: number, now = new Date()) {
  if (date !== dateInZone(now, state.timezone)) throw new Error('Cambió el día. Vuelve a Mi día para registrar el día actual.')
  const source = state.habits.find(h => h.id === habitId)
  if (!source || !scheduled(source, date)) throw new Error('Este hábito no está programado para hoy.')
  const habit = habitOnDate(source, date)
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 100000 || (habit.kind === 'binary' && amount > 1)) throw new Error('Escribe un progreso entero válido.')
  const before = rewards(state)
  const record = recordFor(state, habitId, date)
  if (record) record.amount = amount
  else state.records.push({ habitId, date, amount, target: habit.target })
  const after = rewards(state)
  reconcilePurchases(state.commerce, after.coins)
  return { xp: after.xp - before.xp, coins: after.coins - before.coins }
}
export function emptyHabitState(timezone = Intl.DateTimeFormat().resolvedOptions().timeZone): HabitState { return { version: 1, timezone, habits: [], records: [], commerce: emptyCommerce() } }
export function streakFor(state: HabitState, habitId: string, date: string): number {
  const habit = state.habits.find(h => h.id === habitId)
  if (!habit) return 0
  let cursor = date; let count = 0
  while (cursor >= habit.startDate) {
    if (scheduled(habit, cursor) || recordFor(state, habitId, cursor)) {
      const record = recordFor(state, habitId, cursor)
      if (record && record.amount >= record.target) count++
      else if (cursor !== date) break
    }
    cursor = shiftDate(cursor, -1)
  }
  return count
}
export function previewProgress(state: HabitState, habitId: string, date: string, amount: number, now = new Date()) {
  const snapshot: HabitState = JSON.parse(JSON.stringify(state))
  const before = rewards(state)
  const beforeBalance = balance(state.commerce, before.coins)
  const delta = changeProgress(snapshot, habitId, date, amount, now)
  const after = rewards(snapshot)
  const returned = snapshot.commerce.purchases.filter((p, i) => p.status === 'returned' && state.commerce.purchases[i]?.status === 'owned')
  return { delta, beforeXp: before.xp, afterXp: after.xp, beforeBalance, afterBalance: balance(snapshot.commerce, after.coins), beforeStage: stageFor(before.xp).level, afterStage: stageFor(after.xp).level, beforeStreak: streakFor(state, habitId, date), afterStreak: streakFor(snapshot, habitId, date), returned, fingerprint: JSON.stringify(state), amount }
}
export function parseHabitState(raw: string | null): HabitState | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as HabitState
    if (!value || value.version !== 1 || typeof value.timezone !== 'string' || !Array.isArray(value.habits) || !Array.isArray(value.records)) return null
    dateInZone(new Date(), value.timezone)
    const ids = new Set<string>()
    for (const h of value.habits) {
      if (!h || typeof h.id !== 'string' || !h.id || ids.has(h.id) || validateDraft(h)) return null
      const today = dateInZone(new Date(), value.timezone)
      if (h.archivedOn !== undefined && (!validDate(h.archivedOn) || h.archivedOn > today)) return null
      if (h.revisions !== undefined) {
        if (!Array.isArray(h.revisions)) return null
        let prior = ''
        for (const revision of h.revisions) {
          if (!revision || !validDate(revision.from) || revision.from <= prior || revision.from > shiftDate(today, 1) || validateDraft({ ...h, target: revision.target, days: revision.days }) || (h.archivedOn && revision.from > h.archivedOn)) return null
          prior = revision.from
        }
      }
      if (h.nameHistory !== undefined) {
        if (!Array.isArray(h.nameHistory) || !h.nameHistory.length) return null
        let prior = ''
        for (const entry of h.nameHistory) {
          if (!entry || !validDate(entry.from) || entry.from <= prior || entry.from > today || typeof entry.name !== 'string' || !entry.name.trim() || Array.from(entry.name.trim()).length > 60) return null
          prior = entry.from
        }
        if (h.nameHistory.at(-1)!.name.trim() !== h.name) return null
      }
      ids.add(h.id)
    }
    const keys = new Set<string>()
    const today = dateInZone(new Date(), value.timezone)
    for (const r of value.records) {
      const h = value.habits.find(h => h.id === r?.habitId)
      const key = `${r?.habitId}:${r?.date}`
      if (!h || !validDate(r.date) || r.date > today || (h.archivedOn && r.date > h.archivedOn) || !scheduled({ ...h, archivedOn: undefined }, r.date) || keys.has(key) || !Number.isSafeInteger(r.amount) || r.amount < 0 || r.amount > 100000 || (h.kind === 'binary' && r.amount > 1) || r.target !== settingsFor(h, r.date).target) return null
      keys.add(key)
    }
    const commerce = parseCommerce(value.commerce, rewards(value).coins)
    if (!commerce) return null
    // Rebuild the allowlisted structure instead of retaining unknown stored fields.
    return { version: 1, timezone: value.timezone, commerce, habits: value.habits.map(h => ({ id: h.id, templateId: h.templateId, name: h.name.trim(), kind: h.kind, unit: h.unit.trim(), target: h.target, days: [...h.days], startDate: h.startDate, ...(h.time ? { time: h.time } : {}), ...(h.archivedOn ? { archivedOn: h.archivedOn } : {}), ...(h.revisions ? { revisions: h.revisions.map(r => ({ from: r.from, target: r.target, days: [...r.days] })) } : {}), ...(h.nameHistory ? { nameHistory: h.nameHistory.map(n => ({ from: n.from, name: n.name.trim() })) } : {}) })), records: value.records.map(r => ({ habitId: r.habitId, date: r.date, amount: r.amount, target: r.target })) }
  } catch { return null }
}
