import type { HabitState } from './habits'
import type { PreviewProfile } from './preview'

export interface GardenSnapshot {
  userId: string; displayName: string; revision: number; today: string;
  pet: PreviewProfile | null; state: HabitState;
  totals: { xp: number; monedas_ganadas: number; saldo: number; etapa: number }
}
export function normalizeSnapshot(value: GardenSnapshot, expectedUser: string): GardenSnapshot {
  if (!value || value.userId !== expectedUser || !Number.isSafeInteger(value.revision) || !value.state || !Array.isArray(value.state.habits)) {
    throw new Error('No pudimos verificar los datos de tu cuenta.')
  }
  // SQL usa null para campos opcionales; el dominio local utiliza ausencia de propiedad.
  for (const habit of value.state.habits) {
    if (!habit.archivedOn) delete habit.archivedOn
    if (!habit.time) delete habit.time
  }
  return value
}
export function accountError(error: unknown): string {
  const e = error as { code?: string; message?: string }
  if (e?.code === 'invalid_credentials') return 'El correo o la contraseña no coinciden.'
  if (e?.code === 'email_not_confirmed') return 'Confirma tu correo antes de entrar. Revisa también la carpeta de spam.'
  if (e?.code === 'same_password') return 'Elige una contraseña diferente de la anterior.'
  if (e?.code === 'weak_password') return 'La contraseña no cumple los requisitos de seguridad. Prueba con una más larga y variada.'
  if (e?.code === 'email_address_not_authorized') return 'El envío de correos está en modo de pruebas. Por ahora usa el correo del equipo de Brotito.'
  if (e?.code === 'email_address_invalid') return 'Revisa que la dirección de correo esté escrita correctamente.'
  if (e?.code === 'over_email_send_rate_limit' || e?.code === 'over_request_rate_limit' || e?.code === '429') return 'Se hicieron varios intentos. Espera un momento antes de volver a probar.'
  if (e?.code === '40001') return 'Tu progreso o la fecha cambiaron. Actualiza tu jardín y vuelve a revisar.'
  if (e?.code === '23505') return 'Ese elemento ya está guardado en tu cuenta. Actualiza para verlo.'
  if (/fetch|network|timeout/i.test(e?.message ?? '')) return 'No pudimos conectar. Comprueba tu conexión y vuelve a intentarlo.'
  if (e?.code === 'P0001') return e.message ?? 'No se pudo guardar el cambio.'
  return 'No pudimos completar la operación. Intenta de nuevo o vuelve a iniciar sesión.'
}
