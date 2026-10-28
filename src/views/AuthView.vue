<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '../components/AppButton.vue'
import AppField from '../components/AppField.vue'
import BrandCard from '../components/BrandCard.vue'
import ViewHeader from '../components/ViewHeader.vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '../stores/account'
const account = useAccountStore()
const router = useRouter()
const busy = ref(false)
const props = defineProps<{ mode: 'login' | 'register' | 'recover' }>()
const form = reactive({ name: '', email: '', password: '', confirmation: '' })
const errors = ref<Record<string, string>>({})
const message = ref('')
const isRegister = computed(() => props.mode === 'register')
const isRecover = computed(() => props.mode === 'recover')
watch(() => props.mode, () => { form.name = ''; form.email = ''; form.password = ''; form.confirmation = ''; errors.value = {}; message.value = '' })

async function submit() {
  if (busy.value) return
  const next: Record<string, string> = {}
  if (isRegister.value && !form.name.trim()) next.name = 'Escribe tu nombre.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Escribe un correo válido.'
  if (!isRecover.value && !form.password) next.password = 'Escribe tu contraseña.'
  if (isRegister.value && form.password.length < 8) next.password = 'Usa al menos 8 caracteres.'
  if (isRegister.value && form.password !== form.confirmation) next.confirmation = 'Las contraseñas no coinciden.'
  errors.value = next
  message.value = ''
  if (Object.keys(next).length) return
  busy.value = true
  try {
    if (isRecover.value) { await account.recover(form.email.trim()); message.value = 'Si el correo corresponde a una cuenta, recibirás un enlace. Ábrelo en este mismo navegador y revisa también spam.' }
    else if (isRegister.value) {
      const signedIn = await account.register(form.name.trim(),form.email.trim(),form.password)
      form.password = ''; form.confirmation = ''
      if (signedIn) await router.push('/jardin/mi-dia')
      else message.value = 'Revisa tu correo para confirmar la cuenta. Abre el enlace en este mismo navegador. Si ya tenías una cuenta, puedes iniciar sesión o recuperar el acceso.'
    } else { await account.login(form.email.trim(),form.password); form.password = ''; await router.push('/jardin/mi-dia') }
  } catch (error) { message.value = error instanceof Error ? error.message : 'No pudimos completar el acceso.' }
  finally { busy.value = false }
}
</script>

<template>
  <form class="view-stack" novalidate @submit.prevent="submit">
    <ViewHeader :back="mode === 'login' ? undefined : '/acceso'" back-label="Iniciar sesión" :detail="mode === 'login' ? 'Bienvenida' : mode === 'register' ? 'Brotito' : 'Recuperar acceso'" />
    <h1 v-if="mode === 'login'" tabindex="-1">Tu pequeño hogar<br />te estaba esperando.</h1>
    <h1 v-else-if="isRegister" tabindex="-1">Aquí empieza<br />tu primer brote.</h1>
    <h1 v-else tabindex="-1">Volvamos<br />a tu refugio.</h1>
    <BrandCard v-if="mode === 'login'" message="Un brote a la vez, contigo." />
    <p v-if="isRegister" class="muted">Crea tu cuenta y encuentra una compañera del bosque.</p>
    <p v-if="isRecover" class="muted">Escribe el correo de tu cuenta y te ayudaremos a crear una nueva contraseña.</p>
    <AppField v-if="isRegister" id="account-name" v-model="form.name" label="Cómo te llamas" placeholder="Tu nombre" autocomplete="given-name" :error="errors.name" :maxlength="80" />
    <AppField id="account-email" v-model="form.email" type="email" label="Correo electrónico" placeholder="hola@example.com" autocomplete="email" :error="errors.email" />
    <AppField v-if="!isRecover" id="account-password" v-model="form.password" type="password" label="Contraseña" placeholder="••••••••" :autocomplete="isRegister ? 'new-password' : 'current-password'" :hint="isRegister ? 'Usa al menos 8 caracteres.' : undefined" :error="errors.password" />
    <AppField v-if="isRegister" id="account-confirmation" v-model="form.confirmation" type="password" label="Confirmar contraseña" placeholder="••••••••" autocomplete="new-password" :error="errors.confirmation" />
    <p v-if="isRegister" class="caption muted">Versión de desarrollo: tu correo y progreso se guardarán en el proyecto de Brotito en Supabase. La vista previa local se conserva por separado.</p>
    <GardenLink v-if="mode === 'login'" to="/recuperar-acceso" class="text-link">¿Olvidaste tu contraseña?</GardenLink>
    <div v-if="message" class="notice" role="status">{{ message }}</div>
    <AppButton type="submit" :disabled="busy">{{ busy ? 'Un momento…' : isRegister ? 'Crear mi cuenta' : isRecover ? 'Enviar enlace de recuperación' : 'Entrar a mi hogar' }}</AppButton>
    <p v-if="mode === 'login'" class="caption muted">¿Es tu primera visita?</p>
    <AppButton :to="mode === 'login' ? '/registro' : '/acceso'" variant="secondary">{{ mode === 'login' ? 'Crear mi cuenta' : isRegister ? 'Ya tengo una cuenta' : 'Volver a iniciar sesión' }}</AppButton>
    <BrandCard v-if="isRecover" message="Tus brotes siguen aquí." />
  </form>
</template>

