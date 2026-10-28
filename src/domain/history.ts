import { habitOnDate, recordFor, scheduled, shiftDate, streakFor, validDate, type Habit, type HabitState } from './habits'
import { weekdays } from '../data/templates'
export function daysLabel(days: number[]) { return days.length === 7 ? 'Todos los días' : weekdays.filter(d => days.includes(d.value)).map(d => d.name).join(', ') }
export type DayStatus = 'complete' | 'partial' | 'missed' | 'pending' | 'rest' | 'future' | 'not-started' | 'archived'
export function historyDay(state: HabitState, habit: Habit, date: string, today: string) {
  const view = habitOnDate(habit, date)
  const record = recordFor(state, habit.id, date)
  let status: DayStatus
  if (date > today) status = 'future'
  else if (date < habit.startDate) status = 'not-started'
  else if (record && record.amount >= record.target) status = 'complete'
  else if (record && record.amount > 0) status = 'partial'
  else if (habit.archivedOn && date >= habit.archivedOn) status = 'archived'
  else if (!scheduled(habit, date)) status = 'rest'
  else status = date === today ? 'pending' : 'missed'
  return { date, habit: view, record, status, target: record?.target ?? view.target, amount: record?.amount ?? 0 }
}
export const dayLabels: Record<DayStatus, string> = { complete: 'Completado', partial: 'Meta no alcanzada', missed: 'Sin registro', pending: 'Pendiente', rest: 'Descanso', future: 'Día futuro', 'not-started': 'Aún no comenzaba', archived: 'Archivado' }
export function monthCells(month: string) {
  const first = `${month}-01`
  if (!validDate(first)) return []
  const date = new Date(`${first}T12:00:00Z`)
  const padding = (date.getUTCDay() + 6) % 7
  const days = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
  return [...Array.from({ length: padding }, () => null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)]
}
export function bestStreak(state: HabitState, habit: Habit, today: string) {
  const end = habit.archivedOn && habit.archivedOn < today ? habit.archivedOn : today
  let count = 0; let best = 0
  for (let date = habit.startDate; date <= end; date = shiftDate(date, 1)) {
    const record = recordFor(state, habit.id, date)
    if (!scheduled(habit, date) && !record) continue
    count = record && record.amount >= record.target ? count + 1 : 0
    best = Math.max(best, count)
  }
  return best
}
export function historySummary(state: HabitState, habit: Habit, today: string) {
  const week = Array.from({ length: 7 }, (_, i) => historyDay(state, habit, shiftDate(today, i - 6), today))
  return { streak: streakFor(state, habit.id, today), best: bestStreak(state, habit, today), completed: week.filter(d => d.status === 'complete').length, planned: week.filter(d => scheduled(habit, d.date) || d.record).length }
}
export function recentDays(state: HabitState, habit: Habit, today: string, limit = 7) {
  const result = []
  const end = habit.archivedOn && habit.archivedOn < today ? habit.archivedOn : today
  for (let date = end; date >= habit.startDate && result.length < limit; date = shiftDate(date, -1)) {
    if (scheduled(habit, date) || recordFor(state, habit.id, date)) result.push(historyDay(state, habit, date, today))
  }
  return result
}
