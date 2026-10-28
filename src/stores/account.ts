import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { Session } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'
import { accountError, normalizeSnapshot, type GardenSnapshot } from '../domain/account'

export const useAccountStore = defineStore('account', () => {
  const session = shallowRef<Session | null>(null)
  const garden = ref<GardenSnapshot | null>(null)
  const mode = ref(false)
  const ready = ref(false)
  const busy = ref(false)
  const warning = ref('')
  const recovery = ref(false)
  const userId = computed(() => session.value?.user.id ?? null)
  let initialization: Promise<void> | undefined
  let loading: Promise<void> | undefined
  let generation = 0
  function acceptSession(next: Session | null) {
    if (session.value?.user.id !== next?.user.id) {
      generation++; garden.value = null; ready.value = false; loading = undefined; warning.value = ''; recovery.value = false
    }
    session.value = next
  }
  async function initialize() {
    if (!initialization) initialization = (async () => {
      const client = getSupabase()
      client.auth.onAuthStateChange((event, next) => {
        acceptSession(next)
        if (event === 'PASSWORD_RECOVERY') recovery.value = true
        // No llamadas asíncronas a Supabase dentro de este callback.
      })
      const { data, error } = await client.auth.getSession()
      if (error) throw error
      acceptSession(data.session)
    })().catch(error => { initialization = undefined; throw error })
    return initialization
  }
  async function refresh() {
    await initialize()
    if (!userId.value) throw new Error('Inicia sesión.')
    if (loading) return loading
    const owner = userId.value; const ticket = generation; const token = session.value!.access_token
    const task = (async () => {
      const client = getSupabase()
      const { data: profile, error: profileError } = await client.from('perfiles').select('id').eq('id', owner).maybeSingle().setHeader('Authorization',`Bearer ${token}`)
      if (profileError) throw profileError
      if (ticket !== generation || owner !== userId.value) return
      if (!profile) {
        const { error } = await client.rpc('brotito_iniciar_perfil', {
          p_nombre: String(session.value?.user.user_metadata?.name ?? 'Mi jardín').slice(0,80) || 'Mi jardín',
          p_zona_horaria: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }).setHeader('Authorization',`Bearer ${token}`)
        if (error) throw error
      }
      if (ticket !== generation || owner !== userId.value) return
      const { data, error } = await client.rpc('brotito_jardin').setHeader('Authorization',`Bearer ${token}`)
      if (error) throw error
      if (ticket !== generation || owner !== userId.value) return
      garden.value = normalizeSnapshot(data,owner); ready.value = true; warning.value = ''
    })().catch(error => {
      if (ticket === generation) { ready.value = false; warning.value = accountError(error) }
      throw error
    })
    loading = task
    try { await task } finally { if (loading === task) loading = undefined }
  }
  async function mutate<T = unknown>(name: string, args: Record<string,unknown>, revision = garden.value?.revision, date = garden.value?.today): Promise<T> {
    if (!ready.value || !userId.value || !garden.value || garden.value.userId !== userId.value) throw new Error('Actualiza tu jardín antes de guardar.')
    if (busy.value) throw new Error('Espera a que termine el guardado anterior.')
    const owner = userId.value; const ticket = generation; const token = session.value!.access_token
    busy.value = true
    let saved = false
    try {
      const { data,error } = await getSupabase().rpc(name,{...args,p_revision:revision,p_fecha:date}).setHeader('Authorization',`Bearer ${token}`)
      if (error) throw error
      saved = true
      if (ticket !== generation || owner !== userId.value) throw new Error('La sesión cambió durante el guardado.')
      if (loading) await loading.catch(()=>{})
      await refresh()
      return data as T
    } catch (error) {
      if (ticket === generation) {
        ready.value = false
        warning.value = saved ? 'El cambio se guardó, pero falta actualizar la pantalla. Pulsa Actualizar mi jardín.' : accountError(error)
      }
      throw new Error(saved ? 'El cambio se guardó. Actualiza tu jardín para verlo.' : accountError(error))
    } finally { busy.value = false }
  }
  async function login(email: string,password: string) {
    await initialize()
    const {data,error} = await getSupabase().auth.signInWithPassword({email,password})
    if (error) throw new Error(accountError(error))
    acceptSession(data.session); await refresh()
  }
  async function register(name: string,email: string,password: string) {
    await initialize()
    const {data,error} = await getSupabase().auth.signUp({email,password,options:{data:{name},emailRedirectTo:`${location.origin}/cuenta/confirmar`}})
    if (error) throw new Error(accountError(error))
    if (data.session) { acceptSession(data.session); await refresh() }
    return Boolean(data.session)
  }
  async function recover(email: string) {
    await initialize()
    const {error} = await getSupabase().auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/cuenta/restablecer`})
    if (error) throw new Error(accountError(error))
  }
  async function callback(code: string, isRecovery: boolean) {
    await initialize()
    if (!code) throw new Error('El enlace está incompleto o ya fue utilizado. Solicita uno nuevo.')
    const {data,error} = await getSupabase().auth.exchangeCodeForSession(code)
    if (error) throw new Error('El enlace venció, ya fue utilizado o se abrió en otro navegador. Solicita uno nuevo desde este navegador.')
    acceptSession(data.session)
    if (isRecovery && !recovery.value) throw new Error('Este enlace no permite cambiar la contraseña. Solicita uno de recuperación.')
    if (!isRecovery) await refresh()
  }
  async function resetPassword(password: string) {
    if (!recovery.value || !session.value) throw new Error('Solicita un nuevo enlace de recuperación.')
    const {error} = await getSupabase().auth.updateUser({password})
    if (error) throw new Error(accountError(error))
    recovery.value = false
    // La actualización ya se confirmó: fallar al cerrar sesión no la revierte.
    try { await logout(); return true }
    catch { return false }
  }
  async function logout() {
    const {error} = await getSupabase().auth.signOut({scope:'local'})
    if (error) throw new Error(accountError(error))
    acceptSession(null)
  }
  return { session,userId,garden,mode,ready,busy,warning,recovery,initialize,refresh,mutate,login,register,recover,callback,resetPassword,logout }
})
