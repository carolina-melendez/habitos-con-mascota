export interface HabitTemplate {
  id: string; name: string; description: string; unitLabel: string;
  kind: 'quantity' | 'binary'; units: string[]; target: number; title: string; hint?: string; time?: string;
}
export const templates: HabitTemplate[] = [
  { id: 'agua', name: 'Consumir agua', description: 'Un vaso a la vez, a tu propio ritmo.', unitLabel: 'Vasos por día', kind: 'quantity', units: ['vasos'], target: 8, title: 'Un vaso,\nun pequeño paso.', hint: '8 es un punto de partida. Elige la cantidad que se adapte a ti.' },
  { id: 'lectura', name: 'Leer un ratito', description: 'Abre un libro y regálate una pausa.', unitLabel: 'Minutos o páginas', kind: 'quantity', units: ['minutos', 'páginas'], target: 20, title: 'Una página,\nun pequeño refugio.' },
  { id: 'caminar', name: 'Caminar', description: 'Un paseo para conectar contigo.', unitLabel: 'Minutos por día', kind: 'quantity', units: ['minutos'], target: 15, title: 'Un paseo\na tu propio ritmo.' },
  { id: 'movimiento', name: 'Mover el cuerpo', description: 'Un momento de movimiento para ti.', unitLabel: 'Sí / no', kind: 'binary', units: ['veces'], target: 1, title: 'Un momento\npara moverte.' },
  { id: 'descanso', name: 'Prepararme para dormir', description: 'Cierra el día con un poco de calma.', unitLabel: 'Hora objetivo', kind: 'binary', units: ['veces'], target: 1, time: '22:00', title: 'Un cierre suave\npara tu día.' },
]
export const customTemplate: HabitTemplate = { id: 'propio', name: '', description: 'Un hábito pequeño, hecho a tu medida.', unitLabel: 'Personalizado', kind: 'binary', units: ['veces'], target: 1, title: 'Tu jardín,\ntus pequeños pasos.' }
export function findTemplate(id: string) { return id === 'propio' ? customTemplate : templates.find(t => t.id === id) }
export const weekdays = [ { value: 1, label: 'L', name: 'Lunes' }, { value: 2, label: 'M', name: 'Martes' }, { value: 3, label: 'X', name: 'Miércoles' }, { value: 4, label: 'J', name: 'Jueves' }, { value: 5, label: 'V', name: 'Viernes' }, { value: 6, label: 'S', name: 'Sábado' }, { value: 0, label: 'D', name: 'Domingo' } ]
