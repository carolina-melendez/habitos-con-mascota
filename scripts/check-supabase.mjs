import { readFileSync } from 'node:fs'

try {
  const values = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter(line => line.trim() && !line.trim().startsWith('#'))
    .map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1).trim()] }))
  const url = values.VITE_SUPABASE_URL
  const key = values.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key?.startsWith('sb_publishable_')) throw new Error('Falta URL o clave pública en .env.local.')
  const response = await fetch(new URL('/auth/v1/settings', url), {
    headers: { apikey: key }, signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new Error(`Supabase respondió HTTP ${response.status}.`)
  const settings = await response.json()
  console.log(JSON.stringify({ connection: 'ok', emailEnabled: settings.external?.email,
    signupDisabled: settings.disable_signup, emailConfirmation: settings.mailer_autoconfirm === false }))
} catch (error) {
  console.error('No se pudo verificar Supabase:', error.message)
  process.exitCode = 1
}
