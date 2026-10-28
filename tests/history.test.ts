import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { HABITS_KEY, archiveHabit, changeProgress, editHabit, emptyHabitState, habitOnDate, parseHabitState, rewards, scheduled, settingsFor, streakFor } from '../src/domain/habits'
import { bestStreak, dayLabels, historyDay, historySummary, monthCells } from '../src/domain/history'
import { buy, equip } from '../src/domain/commerce'
import { useHabitsStore } from '../src/stores/habits'

const today = '2026-10-20'
const now = new Date('2026-10-20T18:00:00Z')
function garden() {
  const state = emptyHabitState('America/El_Salvador')
  state.habits.push({ id: 'water', templateId: 'agua', name: 'Consumir agua', target: 8, kind: 'quantity', unit: 'vasos', days: [0, 1, 2, 3, 4, 5, 6], startDate: '2026-10-18' })
  changeProgress(state, 'water', '2026-10-19', 8, new Date('2026-10-19T18:00:00Z'))
  changeProgress(state, 'water', today, 8, now)
  return state
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); localStorage.clear(); setActivePinia(createPinia()) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('edición con vigencia por fecha', () => {
  it('renombra hoy y aplica meta/frecuencia mañana sin alterar registros ni recompensas', () => {
    const state = garden()
    const records = JSON.stringify(state.records)
    editHabit(state, 'water', { name: 'Mi agua', target: 10, days: [3] }, now)
    const habit = state.habits[0]!
    expect(habitOnDate(habit, '2026-10-19').name).toBe('Consumir agua')
    expect(habitOnDate(habit, today).name).toBe('Mi agua')
    expect(settingsFor(habit, today).target).toBe(8)
    expect(settingsFor(habit, '2026-10-21').target).toBe(10)
    expect(scheduled(habit, today)).toBe(true)
    expect(scheduled(habit, '2026-10-22')).toBe(false)
    expect(JSON.stringify(state.records)).toBe(records)
    expect(rewards(state)).toEqual({ xp: 20, coins: 10 })
  })
  it('usa la nueva meta al registrar mañana y mantiene la meta anterior en el historial', () => {
    const state = garden()
    editHabit(state, 'water', { name: 'Consumir agua', target: 10, days: [0, 1, 2, 3, 4, 5, 6] }, now)
    const tomorrow = new Date('2026-10-21T18:00:00Z')
    changeProgress(state, 'water', '2026-10-21', 8, tomorrow)
    expect(rewards(state).xp).toBe(20)
    changeProgress(state, 'water', '2026-10-21', 10, tomorrow)
    expect(rewards(state).xp).toBe(30)
    expect(historyDay(state, state.habits[0]!, today, '2026-10-21').target).toBe(8)
    vi.setSystemTime(tomorrow)
    expect(parseHabitState(JSON.stringify(state))?.records.map(r => r.target)).toEqual([8, 8, 10])
  })
  it('una segunda edición reemplaza la pendiente y permite cancelar esa meta futura', () => {
    const state = garden()
    const days = state.habits[0]!.days
    editHabit(state, 'water', { name: 'Agua', target: 10, days }, now)
    editHabit(state, 'water', { name: 'Agua de hoy', target: 12, days: [3] }, now)
    expect(state.habits[0]!.revisions).toHaveLength(1)
    expect(settingsFor(state.habits[0]!, '2026-10-21').target).toBe(12)
    editHabit(state, 'water', { name: 'Agua de hoy', target: 8, days }, now)
    expect(state.habits[0]!.revisions).toEqual([])
    expect(habitOnDate(state.habits[0]!, '2026-10-19').name).toBe('Consumir agua')
  })
  it('conserva versiones anteriores después de nuevas ediciones en otros días', () => {
    const state = garden()
    const days = state.habits[0]!.days
    editHabit(state, 'water', { name: 'Agua 1', target: 10, days }, now)
    editHabit(state, 'water', { name: 'Agua 2', target: 12, days }, new Date('2026-10-22T18:00:00Z'))
    expect(settingsFor(state.habits[0]!, today).target).toBe(8)
    expect(settingsFor(state.habits[0]!, '2026-10-21').target).toBe(10)
    expect(settingsFor(state.habits[0]!, '2026-10-23').target).toBe(12)
    expect(habitOnDate(state.habits[0]!, today).name).toBe('Agua 1')
  })
  it('rechaza frecuencia vacía y metas inválidas sin mutaciones parciales', () => {
    const state = garden(); const before = JSON.stringify(state)
    expect(() => editHabit(state, 'water', { name: 'Cambio', target: 0, days: [2] }, now)).toThrow()
    expect(() => editHabit(state, 'water', { name: 'Cambio', target: 10, days: [] }, now)).toThrow()
    expect(JSON.stringify(state)).toBe(before)
  })
})
describe('archivo desde hoy', () => {
  it('sale del tablero de hoy, conserva registros y monedas, y cancela la edición pendiente', () => {
    const state = garden()
    editHabit(state, 'water', { name: 'Agua', target: 10, days: [3] }, now)
    const before = JSON.stringify(state.records)
    archiveHabit(state, 'water', now)
    expect(scheduled(state.habits[0]!, today)).toBe(false)
    expect(scheduled(state.habits[0]!, '2026-10-19')).toBe(true)
    expect(state.habits[0]!.revisions).toEqual([])
    expect(JSON.stringify(state.records)).toBe(before)
    expect(rewards(state)).toEqual({ xp: 20, coins: 10 })
    expect(parseHabitState(JSON.stringify(state))?.records).toHaveLength(2)
    expect(historyDay(state, state.habits[0]!, today, today).status).toBe('complete')
  })
  it('no permite nuevas correcciones ni ediciones de un hábito archivado', () => {
    const state = garden(); archiveHabit(state, 'water', now)
    expect(() => changeProgress(state, 'water', today, 7, now)).toThrow()
    expect(() => editHabit(state, 'water', { name: 'Agua', target: 10, days: [2] }, now)).toThrow()
    expect(() => archiveHabit(state, 'water', now)).toThrow()
    expect(rewards(state).xp).toBe(20)
  })
  it('archivar no revierte compras ni desequipa accesorios', () => {
    const state = garden()
    for (let i = 0; i < 6; i++) {
      state.habits.push({ ...state.habits[0]!, id: `other-${i}` })
      changeProgress(state, `other-${i}`, today, 8, now)
    }
    buy(state.commerce, 'panuelo', rewards(state).coins, now); equip(state.commerce, 'panuelo')
    const before = JSON.stringify(state.commerce)
    archiveHabit(state, 'water', now)
    expect(JSON.stringify(state.commerce)).toBe(before)
    expect(rewards(state).coins).toBe(40)
  })
})
describe('historial y rachas', () => {
  it('genera meses completos alineados de lunes a domingo, incluyendo febrero bisiesto', () => {
    expect(monthCells('2026-10').slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
    expect(monthCells('2028-02').filter(Boolean)).toHaveLength(29)
    expect(monthCells('2026-13')).toEqual([])
  })
  it('distingue días futuros, descanso, no iniciado, sin registro, parcial y completo', () => {
    const state = garden(); const habit = state.habits[0]!
    expect(historyDay(state, habit, '2026-10-21', today).status).toBe('future')
    expect(historyDay(state, habit, '2026-10-17', today).status).toBe('not-started')
    expect(historyDay(state, habit, '2026-10-18', today).status).toBe('missed')
    expect(historyDay(state, habit, today, today).status).toBe('complete')
    changeProgress(state, 'water', today, 6, now)
    expect(historyDay(state, habit, today, today).status).toBe('partial')
    habit.days = [1]
    expect(historyDay(state, habit, '2026-10-18', today).status).toBe('rest')
    expect(dayLabels.missed).toBe('Sin registro')
  })
  it('no rompe rachas por descansos y mantiene la mejor racha al corregir hoy', () => {
    const state = garden(); const habit = state.habits[0]!
    habit.days = [1, 2, 4]
    expect(streakFor(state, 'water', today)).toBe(2)
    expect(bestStreak(state, habit, today)).toBe(2)
    changeProgress(state, 'water', today, 6, now)
    expect(historySummary(state, habit, today)).toMatchObject({ streak: 1, best: 1, completed: 1, planned: 2 })
  })
  it('cierra días pasados y mantiene la meta histórica después de editar', () => {
    const state = garden()
    editHabit(state, 'water', { name: 'Agua', target: 4, days: [2] }, now)
    expect(() => changeProgress(state, 'water', '2026-10-19', 7, now)).toThrow('Cambió el día')
    expect(historyDay(state, state.habits[0]!, '2026-10-19', today)).toMatchObject({ target: 8, amount: 8, status: 'complete' })
  })
})
describe('persistencia y concurrencia de edición', () => {
  it('migra datos anteriores y conserva el saldo al guardar y recargar las versiones', () => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(garden()))
    const store = useHabitsStore()
    store.edit('water', { name: 'Agua', target: 10, days: [3] }, today, store.habitFingerprint('water'))
    setActivePinia(createPinia())
    const reloaded = useHabitsStore()
    expect(reloaded.habitForDate('water')?.target).toBe(8)
    expect(reloaded.habitForDate('water', '2026-10-21')?.target).toBe(10)
    expect(reloaded.totals).toEqual({ xp: 20, coins: 10 })
  })
  it('revalida el día y la versión antes de guardar una edición o archivo', () => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(garden()))
    const store = useHabitsStore(); const fingerprint = store.habitFingerprint('water')
    store.edit('water', { name: 'Agua', target: 10, days: [3] }, today, fingerprint)
    expect(() => store.archive('water', today, fingerprint)).toThrow('cambió')
    const fresh = store.habitFingerprint('water')
    vi.setSystemTime(new Date('2026-10-21T06:00:00Z'))
    expect(() => store.edit('water', { name: 'Agua', target: 12, days: [3] }, today, fresh)).toThrow('Cambió el día')
    expect(() => store.archive('water', today, fresh)).toThrow('Cambió el día')
  })
  it('rechaza versiones corruptas, duplicadas o que contradicen metas guardadas', () => {
    const state = garden()
    state.habits[0]!.revisions = [{ from: '2026-10-19', target: 10, days: [0, 1, 2, 3, 4, 5, 6] }]
    expect(parseHabitState(JSON.stringify(state))).toBeNull()
    state.habits[0]!.revisions = [{ from: '2026-10-21', target: 10, days: [] }]
    expect(parseHabitState(JSON.stringify(state))).toBeNull()
    state.habits[0]!.revisions = [{ from: '2026-10-21', target: 10, days: [3] }, { from: '2026-10-21', target: 12, days: [3] }]
    expect(parseHabitState(JSON.stringify(state))).toBeNull()
  })
  it('oculta archivados del tablero tras recargar y conserva las fechas del historial', () => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(garden()))
    const store = useHabitsStore()
    store.archive('water', today, store.habitFingerprint('water'))
    setActivePinia(createPinia())
    const reloaded = useHabitsStore()
    expect(reloaded.todaysHabits).toHaveLength(0)
    expect(reloaded.laterHabits).toHaveLength(0)
    expect(reloaded.state.habits).toHaveLength(1)
    expect(reloaded.totals).toEqual({ xp: 20, coins: 10 })
  })
})
