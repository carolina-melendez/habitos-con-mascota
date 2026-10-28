import { isPetId, type PetId } from '../data/pets'

export const PREVIEW_KEY = 'brotito.preview.v1'
export interface PreviewProfile { petId: PetId; petName: string }

export function validatePetName(value: string): string | undefined {
  const length = Array.from(value.trim()).length
  if (!length) return 'Escribe un nombre para tu mascota.'
  if (length > 30) return 'El nombre puede tener hasta 30 caracteres.'
}

export function parsePreviewProfile(raw: string | null): PreviewProfile | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    if (!isPetId(record.petId) || typeof record.petName !== 'string' || validatePetName(record.petName)) return null
    return { petId: record.petId, petName: record.petName.trim() }
  } catch { return null }
}
