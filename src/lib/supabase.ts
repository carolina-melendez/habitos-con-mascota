import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

// Lazy initialization keeps the local preview usable without cloud configuration.
export function getSupabase(): SupabaseClient {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !key) throw new Error('Falta configurar la conexión con Supabase.')
  if (!key.startsWith('sb_publishable_')) throw new Error('Usa la clave pública de Supabase.')
  const endpoint = new URL(url)
  if (endpoint.protocol !== 'https:' || endpoint.hostname === 'supabase.com') {
    throw new Error('Usa la dirección de API del proyecto, no el panel de Supabase.')
  }
  client = createClient(url, key, { auth: { flowType: 'pkce', detectSessionInUrl: false, storageKey: 'brotito.auth.v1' } })
  return client
}
