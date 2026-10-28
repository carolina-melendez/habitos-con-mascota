export const accessories = [
  { id: 'corona', name: 'Corona de flores', price: 60, slot: 'cabeza', category: 'Cabeza', title: 'Una corona\nrecién florecida.', description: 'Flores rosadas con pequeños centros dorados, para llevar un pedacito del jardín contigo.' },
  { id: 'panuelo', name: 'Pañuelo de durazno', price: 40, slot: 'cuello', category: 'Cuello', title: 'Un abrazo\ncolor durazno.', description: 'Un pañuelo suave para acompañar sus pequeños paseos por el bosque.' },
  { id: 'gafas', name: 'Gafas de pétalo', price: 90, slot: 'rostro', category: 'Rostro', title: 'Otra forma\nde ver florecer.', description: 'Unas gafas redonditas para mirar el jardín con curiosidad.' },
] as const
export type AccessoryId = typeof accessories[number]['id']
export type Slot = typeof accessories[number]['slot']
export interface Purchase { id: string; itemId: AccessoryId; paid: number; boughtAt: string; status: 'owned' | 'returned' }
export interface CommerceState { purchases: Purchase[]; equipped: Partial<Record<Slot, AccessoryId>> }
export function findAccessory(id: string) { return accessories.find(a => a.id === id) }
export function emptyCommerce(): CommerceState { return { purchases: [], equipped: {} } }
export function owned(state: CommerceState, itemId: string) { return state.purchases.some(p => p.itemId === itemId && p.status === 'owned') }
export function balance(state: CommerceState, earned: number) { return earned - state.purchases.reduce((sum, p) => sum + (p.status === 'owned' ? p.paid : 0), 0) }
export function buy(state: CommerceState, itemId: string, earned: number, now = new Date()): Purchase {
  const item = findAccessory(itemId)
  if (!item) throw new Error('No encontramos ese accesorio.')
  if (owned(state, itemId)) throw new Error('Este accesorio ya está en tu inventario.')
  if (balance(state, earned) < item.price) throw new Error('Todavía no tienes suficientes monedas para este accesorio.')
  const purchase: Purchase = { id: crypto.randomUUID(), itemId: item.id, paid: item.price, boughtAt: now.toISOString(), status: 'owned' }
  state.purchases.push(purchase)
  return purchase
}
export function equip(state: CommerceState, itemId: string) {
  const item = findAccessory(itemId)
  if (!item || !owned(state, itemId)) throw new Error('Solo puedes equipar accesorios que tengas en tu inventario.')
  state.equipped[item.slot] = item.id
}
export function unequip(state: CommerceState, itemId: string) {
  const item = findAccessory(itemId)
  if (item && state.equipped[item.slot] === itemId) delete state.equipped[item.slot]
}
// Array order is the purchase order, even if two purchases share a timestamp.
export function reconcilePurchases(state: CommerceState, earned: number): Purchase[] {
  const returned: Purchase[] = []
  for (let i = state.purchases.length - 1; balance(state, earned) < 0 && i >= 0; i--) {
    const purchase = state.purchases[i]!
    if (purchase.status !== 'owned') continue
    purchase.status = 'returned'
    unequip(state, purchase.itemId)
    returned.push({ ...purchase })
  }
  if (balance(state, earned) < 0) throw new Error('No se pudo reconciliar el saldo.')
  return returned
}
export function parseCommerce(raw: unknown, earned: number): CommerceState | null {
  if (raw === undefined) return emptyCommerce() // Existing previews have no purchases yet.
  try {
    const data = raw as CommerceState
    if (!data || !Array.isArray(data.purchases) || !data.equipped || typeof data.equipped !== 'object' || Array.isArray(data.equipped)) return null
    const ids = new Set<string>(); const ownedIds = new Set<string>(); const purchases: Purchase[] = []
    for (const p of data.purchases) {
      if (!p || typeof p.id !== 'string' || !p.id || ids.has(p.id) || !findAccessory(p.itemId) || !Number.isSafeInteger(p.paid) || p.paid < 1 || p.paid > 100000 || typeof p.boughtAt !== 'string' || Number.isNaN(Date.parse(p.boughtAt)) || !['owned', 'returned'].includes(p.status)) return null
      if (p.status === 'owned' && ownedIds.has(p.itemId)) return null
      if (p.status === 'owned') ownedIds.add(p.itemId)
      ids.add(p.id)
      purchases.push({ id: p.id, itemId: p.itemId, paid: p.paid, boughtAt: p.boughtAt, status: p.status })
    }
    const state: CommerceState = { purchases, equipped: {} }
    for (const [slot, id] of Object.entries(data.equipped)) {
      const item = typeof id === 'string' ? findAccessory(id) : undefined
      if (!item || item.slot !== slot || !owned(state, item.id)) return null
      state.equipped[item.slot] = item.id
    }
    return balance(state, earned) >= 0 ? state : null
  } catch { return null }
}
export const stages = [
  { level: 1, xp: 0, name: 'Brote' }, { level: 2, xp: 100, name: 'Crecimiento' },
  { level: 3, xp: 300, name: 'Florecimiento' }, { level: 4, xp: 600, name: 'Jardín del hogar' },
] as const
export function stageFor(xp: number) { return [...stages].reverse().find(s => xp >= s.xp) ?? stages[0] }
export function nextStage(xp: number) { return stages.find(s => s.xp > xp) }
