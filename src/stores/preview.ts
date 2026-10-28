import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useAccountStore } from './account'
import { PREVIEW_KEY, parsePreviewProfile, validatePetName, type PreviewProfile } from '../domain/preview'
import { isPetId, type PetId } from '../data/pets'

export const usePreviewStore = defineStore('preview', () => {
  let saved: string | null = null
  try { saved = localStorage.getItem(PREVIEW_KEY) } catch { /* Storage may be unavailable. */ }
  const account = useAccountStore()
  const localProfile = ref<PreviewProfile | null>(parsePreviewProfile(saved))
  const profile = computed(() => account.mode ? account.garden?.pet ?? null : localProfile.value)
  const selection = ref<PetId>(profile.value?.petId ?? 'flori')
  const storageWarning = ref('')

  function select(id: PetId) { if (isPetId(id)) selection.value = id }
  function save(name: string) {
    const error = validatePetName(name)
    if (error) throw new Error(error)
    const next = { petId: selection.value, petName: name.trim() }
    if (account.mode) return account.mutate('brotito_adoptar', { p_especie: next.petId, p_nombre: next.petName })
    try { localStorage.setItem(PREVIEW_KEY, JSON.stringify(next)); storageWarning.value = '' }
    catch { storageWarning.value = 'Tu navegador no permite guardar esta vista previa. Se perderá al recargar.' }
    localProfile.value = next
  }
  function clear() {
    if (account.mode) throw new Error('El borrado local no está disponible en una cuenta.')
    try { localStorage.removeItem(PREVIEW_KEY) } catch { /* The in-memory preview can still be cleared. */ }
    localProfile.value = null
    selection.value = 'flori'
    storageWarning.value = ''
  }
  return { profile, selection, storageWarning, select, save, clear }
})
