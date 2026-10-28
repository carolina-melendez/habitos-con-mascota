import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { balance, buy, emptyCommerce, equip, nextStage, owned, parseCommerce, reconcilePurchases, stageFor, unequip } from '../src/domain/commerce'
import { HABITS_KEY, changeProgress, emptyHabitState, parseHabitState, previewProgress, rewards, streakFor } from '../src/domain/habits'
import { useHabitsStore } from '../src/stores/habits'

const date = '2026-10-15'
const now = new Date('2026-10-15T18:00:00Z')
function garden(count = 8) {
  const state = emptyHabitState('America/El_Salvador')
  for (let i = 0; i < count; i++) {
    const id = `habit-${i}`
    state.habits.push({ id, templateId: 'movimiento', name: `Hábito ${i}`, kind: 'binary', unit: 'veces', target: 1, days: [0, 1, 2, 3, 4, 5, 6], startDate: '2026-10-12' })
    changeProgress(state, id, date, 1, now)
  }
  return state
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); localStorage.clear(); setActivePinia(createPinia()) })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('crecimiento', () => {
  it('evoluciona exactamente en los umbrales acumulados y sigue sumando al final', async () => {
    expect([0, 99, 100, 299, 300, 599, 600, 1000].map(xp => stageFor(xp).level)).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
    expect(nextStage(100)?.xp).toBe(300)
    expect(nextStage(600)).toBeUndefined()
  })
  it('recalcula etapa al corregir sin retirar accesorios cuando queda saldo suficiente', async () => {
    const state = garden(10)
    buy(state.commerce, 'panuelo', 50, now); equip(state.commerce, 'panuelo')
    const plan = previewProgress(state, 'habit-0', date, 0, now)
    expect([plan.beforeStage, plan.afterStage, plan.beforeBalance, plan.afterBalance]).toEqual([2, 1, 10, 5])
    expect(plan.returned).toHaveLength(0)
    changeProgress(state, 'habit-0', date, 0, now)
    expect(state.commerce.equipped.cuello).toBe('panuelo')
  })
  it('calcula rachas por días programados y no penaliza la experiencia por omitir días', async () => {
    const state = garden(1)
    state.habits[0]!.days = [1, 3, 4]
    state.records.push({ habitId: 'habit-0', date: '2026-10-12', target: 1, amount: 1 }, { habitId: 'habit-0', date: '2026-10-14', target: 1, amount: 1 })
    expect(streakFor(state, 'habit-0', date)).toBe(3)
    expect(previewProgress(state, 'habit-0', date, 0, now).afterStreak).toBe(2)
    expect(rewards(state).xp).toBe(30)
    expect(stageFor(rewards(state).xp).level).toBe(1)
  })
})
describe('compras e inventario', () => {
  it('exige saldo, impide compras duplicadas y no modifica la experiencia', async () => {
    const state = garden()
    expect(() => buy(state.commerce, 'panuelo', 39, now)).toThrow('suficientes monedas')
    buy(state.commerce, 'panuelo', 40, now)
    expect(balance(state.commerce, 40)).toBe(0)
    expect(() => buy(state.commerce, 'panuelo', 100, now)).toThrow('ya está')
    expect(rewards(state).xp).toBe(80)
    expect(() => buy(state.commerce, 'inventado', 100, now)).toThrow()
  })
  it('solo equipa lo adquirido, permite las tres categorías y conserva al quitar', async () => {
    const state = emptyCommerce()
    expect(() => equip(state, 'corona')).toThrow()
    for (const id of ['corona', 'panuelo', 'gafas']) { buy(state, id, 190, now); equip(state, id) }
    expect(state.equipped).toEqual({ cabeza: 'corona', cuello: 'panuelo', rostro: 'gafas' })
    unequip(state, 'corona')
    expect(owned(state, 'corona')).toBe(true)
    expect(state.equipped.cabeza).toBeUndefined()
  })
  it('devuelve la compra más reciente y desequipa únicamente lo devuelto', async () => {
    const state = emptyCommerce()
    buy(state, 'panuelo', 100, now); equip(state, 'panuelo')
    buy(state, 'corona', 100, now); equip(state, 'corona')
    const returned = reconcilePurchases(state, 95)
    expect(returned.map(p => p.itemId)).toEqual(['corona'])
    expect(balance(state, 95)).toBe(55)
    expect(state.equipped).toEqual({ cuello: 'panuelo' })
  })
  it('devuelve el precio pagado y puede revertir varias compras en orden inverso', async () => {
    const state = emptyCommerce()
    buy(state, 'panuelo', 190, now); buy(state, 'corona', 190, now); buy(state, 'gafas', 190, now)
    expect(reconcilePurchases(state, 0).map(p => p.itemId)).toEqual(['gafas', 'corona', 'panuelo'])
    const historical = emptyCommerce()
    historical.purchases.push({ id: 'old-price', itemId: 'corona', paid: 25, boughtAt: now.toISOString(), status: 'owned' })
    expect(reconcilePurchases(historical, 20)[0]?.paid).toBe(25)
    expect(balance(historical, 20)).toBe(20)
  })
  it('volver a completar recupera la recompensa y no recompra accesorios', async () => {
    const state = garden()
    buy(state.commerce, 'panuelo', 40, now); equip(state.commerce, 'panuelo')
    const plan = previewProgress(state, 'habit-0', date, 0, now)
    expect(plan.returned.map(p => p.itemId)).toEqual(['panuelo'])
    expect(owned(state.commerce, 'panuelo')).toBe(true) // Preview is read-only.
    changeProgress(state, 'habit-0', date, 0, now)
    expect(balance(state.commerce, rewards(state).coins)).toBe(35)
    changeProgress(state, 'habit-0', date, 1, now)
    expect(owned(state.commerce, 'panuelo')).toBe(false)
    expect(balance(state.commerce, rewards(state).coins)).toBe(40)
    buy(state.commerce, 'panuelo', 40, now)
    expect(state.commerce.purchases.map(p => p.status)).toEqual(['returned', 'owned'])
  })
})
describe('guardado y confirmación', () => {
  it('migra la vista previa anterior sin perder hábitos, registros ni monedas', async () => {
    const old = garden()
    const { commerce: _unused, ...legacy } = old
    const parsed = parseHabitState(JSON.stringify(legacy))!
    expect(parsed.habits).toHaveLength(8)
    expect(parsed.records).toHaveLength(8)
    expect(parsed.commerce).toEqual(emptyCommerce())
    expect(rewards(parsed)).toEqual({ xp: 80, coins: 40 })
  })
  it('rechaza inventarios imposibles o duplicados sin inventar saldo', async () => {
    const commerce = emptyCommerce()
    buy(commerce, 'corona', 60, now)
    expect(parseCommerce(commerce, 59)).toBeNull()
    commerce.purchases.push({ ...commerce.purchases[0]!, id: 'duplicate-item' })
    expect(parseCommerce(commerce, 120)).toBeNull()
    expect(parseCommerce({ purchases: [], equipped: { cabeza: 'corona' } }, 0)).toBeNull()
  })
  it('persiste la compra y el equipo con el saldo correcto al recargar', async () => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(garden()))
    const store = useHabitsStore()
    store.purchase('panuelo', 40); store.equipItem('panuelo')
    setActivePinia(createPinia())
    const reloaded = useHabitsStore()
    expect(reloaded.owns('panuelo')).toBe(true)
    expect(reloaded.state.commerce.equipped.cuello).toBe('panuelo')
    expect(reloaded.totals).toEqual({ xp: 80, coins: 0 })
  })
  it('no aplica una corrección si cambian las compras o el equipo tras revisarla', async () => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(garden()))
    const store = useHabitsStore()
    const plan = await store.reviewChange('habit-0', date, 0)
    store.purchase('panuelo', 40)
    expect(() => store.update('habit-0', date, 0, plan.fingerprint)).toThrow('cambiaron')
    expect(store.amount('habit-0')).toBe(1)
    expect(store.owns('panuelo')).toBe(true)
    expect(() => store.update('habit-0', date, 0)).toThrow('confirma')
  })
  it('guarda registro corregido, devolución y equipo juntos en una sola escritura', async () => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(garden()))
    const store = useHabitsStore()
    store.purchase('panuelo', 40); store.equipItem('panuelo')
    const plan = await store.reviewChange('habit-0', date, 0)
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    store.update('habit-0', date, 0, plan.fingerprint)
    expect(spy).toHaveBeenCalledTimes(1)
    const saved = parseHabitState(localStorage.getItem(HABITS_KEY))!
    expect(saved.records[0]?.amount).toBe(0)
    expect(saved.commerce.purchases[0]?.status).toBe('returned')
    expect(saved.commerce.equipped).toEqual({})
    expect(store.totals).toEqual({ xp: 70, coins: 35 })
  })
  it('revalida saldo y fecha justo al confirmar', async () => {
    localStorage.setItem(HABITS_KEY, JSON.stringify(garden()))
    const store = useHabitsStore()
    expect(() => store.purchase('panuelo', 45)).toThrow('saldo cambió')
    const plan = await store.reviewChange('habit-0', date, 0)
    vi.setSystemTime(new Date('2026-10-16T06:00:00Z'))
    expect(() => store.update('habit-0', date, 0, plan.fingerprint)).toThrow('Cambió el día')
    expect(store.amount('habit-0', date)).toBe(1)
  })
})
