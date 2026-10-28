import { describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { parsePreviewProfile, PREVIEW_KEY, validatePetName } from '../src/domain/preview'
import { usePreviewStore } from '../src/stores/preview'

describe('vista previa local', () => {
  it('rechaza datos corruptos, criaturas desconocidas y nombres vacíos', () => {
    expect(parsePreviewProfile('{')).toBeNull()
    expect(parsePreviewProfile('{"petId":"desconocida","petName":"Luz"}')).toBeNull()
    expect(parsePreviewProfile('{"petId":"lumi","petName":"   "}')).toBeNull()
    expect(parsePreviewProfile('[]')).toBeNull()
  })
  it('cuenta caracteres Unicode y conserva nombres válidos', () => {
    expect(validatePetName('🌱'.repeat(30))).toBeUndefined()
    expect(validatePetName('🌱'.repeat(31))).toBeTruthy()
    expect(parsePreviewProfile('{"petId":"lumi","petName":"  Luz  "}')).toEqual({ petId: 'lumi', petName: 'Luz' })
  })
  it('persiste la mascota elegida sin almacenar credenciales y permite borrar la vista previa', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = usePreviewStore()
    store.select('seti')
    store.save('Honguito')
    expect(JSON.parse(localStorage.getItem(PREVIEW_KEY)!)).toEqual({ petId: 'seti', petName: 'Honguito' })
    setActivePinia(createPinia())
    expect(usePreviewStore().profile?.petName).toBe('Honguito')
    usePreviewStore().clear()
    expect(localStorage.getItem(PREVIEW_KEY)).toBeNull()
  })
  it('una validación fallida no reemplaza la mascota guardada', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = usePreviewStore()
    store.save('Flori')
    expect(() => store.save(' ')).toThrow()
    expect(store.profile?.petName).toBe('Flori')
  })
  it('permite explorar y avisa si el navegador bloquea el guardado', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const store = usePreviewStore()
    const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    try {
      store.save('Brote')
      expect(store.profile?.petName).toBe('Brote')
      expect(store.storageWarning).toContain('Se perderá al recargar')
    } finally { storage.mockRestore() }
  })
})
