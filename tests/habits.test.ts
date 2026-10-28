import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { HABITS_KEY, changeProgress, dateInZone, emptyHabitState, parseHabitState, recordFor, rewards, scheduled, validateDraft, type HabitDraft } from '../src/domain/habits'
import { useHabitsStore } from '../src/stores/habits'

const now = new Date('2026-10-14T18:00:00Z')
const date = '2026-10-14'
const draft: HabitDraft = { templateId: 'agua', name: 'Consumir agua', kind: 'quantity', unit: 'vasos', target: 8, days: [0, 1, 2, 3, 4, 5, 6], startDate: date }
function fixture() { const state = emptyHabitState('America/El_Salvador'); state.habits.push({ ...draft, days: [...draft.days], id: 'water' }); return state }
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); localStorage.clear(); setActivePinia(createPinia()) })
afterEach(() => vi.useRealTimers())

describe('fechas, programación y validación', () => {
  it('usa el día de la zona horaria y no la fecha UTC', async () => {
    expect(dateInZone(new Date('2026-10-15T05:59:00Z'), 'America/El_Salvador')).toBe(date)
    expect(dateInZone(new Date('2026-10-15T06:00:00Z'), 'America/El_Salvador')).toBe('2026-10-15')
  })
  it('rechaza metas inválidas, nombre vacío, fecha pasada o imposible y frecuencia vacía', async () => {
    for (const target of [0, -1, 1.5, NaN, 1001]) expect(validateDraft({ ...draft, target }, date)).toBeTruthy()
    expect(validateDraft({ ...draft, name: ' ' }, date)).toBeTruthy()
    expect(validateDraft({ ...draft, days: [] }, date)).toBeTruthy()
    expect(validateDraft({ ...draft, startDate: '2026-02-30' }, date)).toBeTruthy()
    expect(validateDraft({ ...draft, startDate: '2026-10-13' }, date)).toBeTruthy()
    expect(validateDraft(draft, date)).toBeUndefined()
  })
  it('no incluye un hábito antes de comenzar ni en un día no elegido', async () => {
    const habit = { ...draft, id: 'water', days: [3] }
    expect(scheduled(habit, date)).toBe(true)
    expect(scheduled(habit, '2026-10-15')).toBe(false)
    expect(scheduled(habit, '2026-10-07')).toBe(false)
  })
  it('valida la hora objetivo y respeta el tipo y la unidad de cada plantilla', async () => {
    expect(validateDraft({ ...draft, unit: 'páginas' })).toBeTruthy()
    expect(validateDraft({ ...draft, templateId: 'descanso', kind: 'binary', target: 1, unit: 'veces', time: '25:00' })).toBeTruthy()
    expect(validateDraft({ ...draft, templateId: 'descanso', kind: 'binary', target: 1, unit: 'veces', time: '22:00' })).toBeUndefined()
  })
})
describe('recompensas y correcciones', () => {
  it('solo recompensa el cruce de la meta; no duplica por repetir ni excederla', async () => {
    const state = fixture()
    expect(changeProgress(state, 'water', date, 7, now)).toEqual({ xp: 0, coins: 0 })
    expect(changeProgress(state, 'water', date, 8, now)).toEqual({ xp: 10, coins: 5 })
    expect(changeProgress(state, 'water', date, 8, now)).toEqual({ xp: 0, coins: 0 })
    expect(changeProgress(state, 'water', date, 9, now)).toEqual({ xp: 0, coins: 0 })
    expect(state.records).toHaveLength(1)
  })
  it('corrige excesos sin retirar la recompensa y revierte al quedar incompleto', async () => {
    const state = fixture()
    changeProgress(state, 'water', date, 9, now)
    expect(changeProgress(state, 'water', date, 8, now)).toEqual({ xp: 0, coins: 0 })
    expect(changeProgress(state, 'water', date, 7, now)).toEqual({ xp: -10, coins: -5 })
    expect(rewards(state)).toEqual({ xp: 0, coins: 0 })
    changeProgress(state, 'water', date, 8, now)
    expect(rewards(state)).toEqual({ xp: 10, coins: 5 })
  })
  it('conserva ayer, abre hoy en cero y bloquea la pestaña abierta antes de medianoche', async () => {
    const state = fixture()
    changeProgress(state, 'water', date, 8, now)
    const tomorrow = new Date('2026-10-15T06:00:00Z')
    expect(() => changeProgress(state, 'water', date, 7, tomorrow)).toThrow('Cambió el día')
    expect(recordFor(state, 'water', '2026-10-15')).toBeUndefined()
    changeProgress(state, 'water', '2026-10-15', 8, tomorrow)
    expect(rewards(state)).toEqual({ xp: 20, coins: 10 })
  })
  it('el sí/no es idempotente y no permite cantidades superiores a uno', async () => {
    const state = fixture()
    state.habits[0] = { ...draft, id: 'water', templateId: 'movimiento', kind: 'binary', target: 1, unit: 'veces' }
    changeProgress(state, 'water', date, 1, now)
    expect(changeProgress(state, 'water', date, 1, now)).toEqual({ xp: 0, coins: 0 })
    expect(() => changeProgress(state, 'water', date, 2, now)).toThrow()
    expect(rewards(state)).toEqual({ xp: 10, coins: 5 })
  })
  it('rechaza registros fuera de fecha, antes del inicio o negativos sin mutar', async () => {
    const state = fixture()
    expect(() => changeProgress(state, 'water', '2026-10-15', 8, now)).toThrow()
    expect(() => changeProgress(state, 'water', date, -1, now)).toThrow()
    state.habits[0]!.startDate = '2026-10-15'
    expect(() => changeProgress(state, 'water', date, 8, now)).toThrow()
    expect(state.records).toHaveLength(0)
  })
})
describe('guardado local', () => {
  it('conserva hábitos y progreso al recargar sin conceder una recompensa extra', async () => {
    const store = useHabitsStore()
    const habit = await store.create(draft)
    store.update(habit.id, store.today, 8)
    setActivePinia(createPinia())
    const reloaded = useHabitsStore()
    expect(reloaded.amount(habit.id)).toBe(8)
    expect(reloaded.totals).toEqual({ xp: 10, coins: 5 })
    expect(reloaded.update(habit.id, reloaded.today, 8)).toEqual({ xp: 0, coins: 0 })
  })
  it('rechaza datos corruptos, registros duplicados y recompensas falsificadas', async () => {
    expect(parseHabitState('{')).toBeNull()
    const state = fixture()
    changeProgress(state, 'water', date, 8, now)
    expect(parseHabitState(JSON.stringify({ ...state, xp: 9999 }))!).not.toHaveProperty('xp')
    state.records.push({ ...state.records[0]! })
    expect(parseHabitState(JSON.stringify(state))).toBeNull()
    localStorage.setItem(HABITS_KEY, '{')
    expect(useHabitsStore().warning).toContain('empieza vacía')
  })
  it('recarga cambios de otra pestaña antes de añadir progreso', async () => {
    const store = useHabitsStore()
    const habit = await store.create(draft)
    const stored = parseHabitState(localStorage.getItem(HABITS_KEY))!
    changeProgress(stored, habit.id, store.today, 7, now)
    localStorage.setItem(HABITS_KEY, JSON.stringify(stored))
    expect(store.adjust(habit.id, store.today, 1)).toEqual({ xp: 10, coins: 5 })
    expect(store.amount(habit.id)).toBe(8)
    store.applyExternal(null)
    expect(store.state.habits).toHaveLength(0)
  })
  it('avisa cuando no puede guardar y mantiene el progreso en memoria', async () => {
    const store = useHabitsStore()
    store.create({ ...draft, name: 'Hábito ya guardado' })
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      const habit = await store.create(draft)
      store.update(habit.id, store.today, 8)
      expect(store.totals).toEqual({ xp: 10, coins: 5 })
      expect(store.warning).toContain('no se conservarán')
    } finally { spy.mockRestore() }
  })
})
