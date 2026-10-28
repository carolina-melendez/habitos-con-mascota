<script setup lang="ts">
import { useRoute } from 'vue-router'
import { onMounted, onUnmounted, ref } from 'vue'
import { useHabitsStore } from './stores/habits'
import { HABITS_KEY } from './domain/habits'
import { useAccountStore } from './stores/account'
import { useRouter } from 'vue-router'
import AppButton from './components/AppButton.vue'
const account = useAccountStore()
const router = useRouter()
const leaving = ref(false)
const route = useRoute()
const habits = useHabitsStore()
let clock: ReturnType<typeof setInterval> | undefined
const refresh = () => { if (account.mode && account.session && !account.busy) void account.refresh().catch(()=>{}); else habits.sync() }
async function logout() { if (leaving.value) return; leaving.value = true; try { await account.logout(); await router.replace('/acceso') } catch(e) { account.warning = e instanceof Error ? e.message : 'No pudimos cerrar la sesión.' } finally { leaving.value = false } }
const storageChanged = (event: StorageEvent) => { if (event.key === HABITS_KEY || event.key === null) habits.applyExternal(event.newValue) }
onMounted(() => { void account.initialize().catch(()=>{}); clock = setInterval(() => { if (account.mode) refresh(); else habits.refreshDay() }, 30000); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh); window.addEventListener('storage', storageChanged) })
onUnmounted(() => { clearInterval(clock); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); window.removeEventListener('storage', storageChanged) })
</script>

<template>
  <a class="skip-link" href="#main-content">Saltar al contenido</a>
  <div class="site-layout">
    <aside class="desktop-note" aria-label="Brotito">
      <p class="wordmark">Brotito</p>
      <h2>Pequeños hábitos,<br />nuevos brotes.</h2>
      <p>Un pequeño refugio entre flores y bosque, iluminado por un atardecer.</p>
      <div class="palette-dots" aria-hidden="true"><span /><span /><span /></div>
    </aside>
    <div class="app-column">
      <div class="preview-toolbar">
        <span>{{ account.mode ? 'Mi jardín · En la nube' : 'Vista previa local' }}</span>
        <button v-if="account.mode && account.session" type="button" class="text-link" :disabled="leaving || account.busy" @click="logout">Cerrar sesión</button>
        <GardenLink v-else :to="route.path.startsWith('/vista-previa') ? '/' : '/vista-previa/mascotas'">{{ route.path.startsWith('/vista-previa') ? 'Volver al inicio' : 'Explorar sin cuenta' }}</GardenLink>
      </div>
      <main id="main-content" class="app-surface">
        <div v-if="account.mode && (!account.ready || !account.session)" class="view-stack">
          <h1 tabindex="-1">{{ account.session ? 'Tu jardín sigue aquí.' : 'Volvamos a tu hogar.' }}</h1>
          <p role="status">{{ account.warning || (account.session ? 'Estamos cargando tu progreso…' : 'Tu sesión terminó. Inicia sesión para continuar.') }}</p>
          <AppButton v-if="account.session" :disabled="account.busy" @click="refresh">Actualizar mi jardín</AppButton>
          <AppButton v-else to="/acceso">Iniciar sesión</AppButton>
        </div>
        <fieldset v-else class="garden-content" :disabled="account.mode && account.busy"><RouterView /></fieldset>
      </main>
      <footer class="site-footer">Hecho para crecer a tu ritmo.</footer>
    </div>
  </div>
</template>
